<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ActiveStatus;
use App\Enums\PeriodStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RoomRequest;
use App\Models\Room;
use App\Services\Geo;
use App\Services\Settings;
use App\Support\Options;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\PerPage;

/**
 * Master Ruang & Titik Presensi. Koordinat tiap ruang menjadi acuan
 * validasi radius saat mahasiswa memindai QR (BR-06).
 */
class RoomController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'building_id', 'readiness']);
        $campusLat = Settings::float('campus_center_lat');
        $campusLng = Settings::float('campus_center_lng');

        $query = Room::query()
            ->with('building:id,name')
            ->withCount('classSchedules')
            ->when($filters['q'] ?? null, fn ($q, string $s) => $q->where(fn ($w) => $w
                ->where('code', 'like', "%{$s}%")
                ->orWhere('name', 'like', "%{$s}%")))
            ->when($filters['building_id'] ?? null, fn ($q, string $v) => $q->where('building_id', $v))
            ->when($filters['readiness'] ?? null, fn ($q, string $v) => match ($v) {
                'ready' => $q->where('status', ActiveStatus::Active)->whereNotNull('latitude'),
                'missing' => $q->where('status', ActiveStatus::Active)->whereNull('latitude'),
                'inactive' => $q->where('status', ActiveStatus::Inactive),
                default => $q,
            });

        $rooms = $query->orderBy('building_id')->orderBy('code')
            ->paginate(PerPage::from($request))
            ->withQueryString()
            ->through(fn (Room $r): array => [
                'id' => $r->id,
                'code' => $r->code,
                'name' => $r->name,
                'building_id' => (string) $r->building_id,
                'building' => $r->building->name,
                'floor' => (string) $r->floor,
                'capacity' => (string) $r->capacity,
                'latitude' => $r->latitude,
                'longitude' => $r->longitude,
                'radius_m' => (string) $r->radius_m,
                'point_accuracy_m' => $r->point_accuracy_m,
                'pointSetAt' => $r->point_set_at?->toIso8601String(),
                'distanceFromCampus' => $r->hasPoint()
                    ? round(Geo::distanceMeters($campusLat, $campusLng, (float) $r->latitude, (float) $r->longitude))
                    : null,
                'usage' => $r->class_schedules_count,
                'status' => $r->status->value,
                'readiness' => $r->readiness(),
            ]);

        // Semua titik (ringan) untuk peringatan irisan radius di form.
        $points = Room::query()->whereNotNull('latitude')->get(['id', 'name', 'latitude', 'longitude', 'radius_m'])
            ->map(fn (Room $r): array => [
                'id' => $r->id, 'name' => $r->name,
                'latitude' => $r->latitude, 'longitude' => $r->longitude, 'radius_m' => $r->radius_m,
            ]);

        return Inertia::render('admin/rooms/index', [
            'rooms' => $rooms,
            'filters' => $filters,
            'summary' => [
                'total' => Room::query()->count(),
                'ready' => Room::query()->where('status', ActiveStatus::Active)->whereNotNull('latitude')->count(),
                'missing' => Room::query()->where('status', ActiveStatus::Active)->whereNull('latitude')->count(),
                'inactive' => Room::query()->where('status', ActiveStatus::Inactive)->count(),
                'buildings' => count(Options::buildings()),
            ],
            'points' => $points,
            'campus' => [
                'latitude' => $campusLat,
                'longitude' => $campusLng,
                'maxDistance' => Settings::int('campus_max_distance_m'),
            ],
            'policy' => [
                'defaultRadius' => Settings::int('default_radius_m'),
                'minRadius' => (int) config('attendance.min_radius_m'),
                'maxRadius' => (int) config('attendance.max_radius_m'),
            ],
            'options' => [
                'buildings' => Options::buildings(),
                'statuses' => ActiveStatus::options(),
            ],
        ]);
    }

    public function store(RoomRequest $request): RedirectResponse
    {
        $room = new Room;
        $this->fillRoom($room, $request->validated());
        $room->save();

        return $this->savedResponse($room, 'ditambahkan');
    }

    public function update(RoomRequest $request, Room $room): RedirectResponse
    {
        $data = $request->validated();

        // BR-22: ruang yang masih dipakai pemetaan aktif tidak bisa dinonaktifkan.
        if ($data['status'] === ActiveStatus::Inactive->value && $room->status === ActiveStatus::Active) {
            $usage = $this->activeUsage($room);
            if ($usage > 0) {
                throw ValidationException::withMessages([
                    'status' => "Ruang ini masih dipakai di {$usage} pemetaan periode berjalan, jadi belum bisa dinonaktifkan.",
                ]);
            }
        }

        $this->fillRoom($room, $data);
        $room->save();

        return $this->savedResponse($room, 'disimpan');
    }

    public function destroy(Room $room): RedirectResponse
    {
        $usage = $room->classSchedules()->count();
        if ($usage > 0) {
            return back()->with('error', "{$room->name} masih dipakai di {$usage} pemetaan, jadi tidak bisa dihapus. Ubah status menjadi Nonaktif.");
        }

        $room->delete();

        return back()->with('success', $room->name.' dihapus.');
    }

    /** @param  array<string, mixed>  $data */
    private function fillRoom(Room $room, array $data): void
    {
        $lat = $data['latitude'] !== null ? round((float) $data['latitude'], 7) : null;
        $lng = $data['longitude'] !== null ? round((float) $data['longitude'], 7) : null;
        $pointChanged = ! $room->exists
            || $lat !== $room->latitude
            || $lng !== $room->longitude;

        $room->fill([
            'code' => $data['code'],
            'name' => $data['name'],
            'building_id' => $data['building_id'],
            'floor' => $data['floor'],
            'capacity' => $data['capacity'],
            'status' => $data['status'],
            'latitude' => $lat,
            'longitude' => $lng,
            'radius_m' => $data['radius_m'],
        ]);

        // Jejak pengukuran hanya diperbarui bila titiknya berubah.
        if ($pointChanged) {
            $room->fill([
                'point_accuracy_m' => $lat !== null ? $data['point_accuracy_m'] : null,
                'point_set_at' => $lat !== null ? now() : null,
                'point_set_by' => $lat !== null ? auth()->id() : null,
            ]);
        }
    }

    private function savedResponse(Room $room, string $verb): RedirectResponse
    {
        $response = back()->with('success', "{$room->name} {$verb}.");

        $overlaps = $this->overlappingRooms($room);
        if ($overlaps !== []) {
            $response->with('warning', 'Radius '.$room->name.' beririsan dengan '.implode(', ', $overlaps).'. Mahasiswa di ruang sebelah bisa ikut masuk radius.');
        }

        return $response;
    }

    /** @return list<string> */
    private function overlappingRooms(Room $room): array
    {
        if (! $room->hasPoint()) {
            return [];
        }

        return Room::query()
            ->whereKeyNot($room->id)
            ->whereNotNull('latitude')
            ->where('status', ActiveStatus::Active)
            ->get(['name', 'latitude', 'longitude', 'radius_m'])
            ->filter(fn (Room $other): bool => Geo::distanceMeters(
                (float) $room->latitude, (float) $room->longitude,
                (float) $other->latitude, (float) $other->longitude,
            ) < $room->radius_m + $other->radius_m)
            ->pluck('name')
            ->values()
            ->all();
    }

    private function activeUsage(Room $room): int
    {
        return $room->classSchedules()
            ->whereHas('academicPeriod', fn ($q) => $q->where('status', '!=', PeriodStatus::Finished))
            ->count();
    }
}
