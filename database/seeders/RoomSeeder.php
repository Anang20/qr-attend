<?php

namespace Database\Seeders;

use App\Enums\ActiveStatus;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Database\Seeder;

/** Gedung dan ruang beserta titik presensi (sama dengan desain). */
class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $buildings = collect([
            ['A', 'Gedung A'],
            ['B', 'Gedung B'],
            ['C', 'Gedung C'],
        ])->mapWithKeys(fn (array $b): array => [
            $b[0] => Building::query()->create(['code' => $b[0], 'name' => $b[1]])->id,
        ]);

        $rooms = [
            // code, name, building, floor, capacity, lat, lng, radius, accuracy, set_at, active
            ['R105', 'Ruang 105', 'A', 1, 40, null, null, 5, null, null, true],
            ['R106', 'Ruang 106', 'A', 1, 40, -6.3450400, 106.6911900, 5, 6.8, '2026-08-05 09:00:00', false],
            ['AULA', 'Aula Utama', 'A', 2, 300, -6.3449800, 106.6911200, 20, 9.5, '2026-08-05 09:30:00', true],
            ['R204', 'Ruang 204', 'B', 2, 40, -6.3451700, 106.6916800, 5, 4.8, '2026-08-12 10:00:00', true],
            ['R208', 'Ruang 208', 'B', 2, 35, -6.3452600, 106.6918300, 5, 6.1, '2026-08-12 10:10:00', true],
            ['R210', 'Ruang 210', 'B', 2, 35, -6.3453100, 106.6919000, 5, 5.2, '2026-08-12 10:20:00', true],
            ['R301', 'Ruang 301', 'B', 3, 40, -6.3452100, 106.6917400, 5, 3.9, '2026-08-12 10:40:00', true],
            ['R302', 'Ruang 302', 'B', 3, 40, -6.3452800, 106.6918600, 5, 7.4, '2026-08-12 10:50:00', true],
            ['LAB1', 'Lab 1', 'C', 1, 36, -6.3455300, 106.6921900, 5, 8.9, '2026-08-14 13:00:00', true],
            ['LAB2', 'Lab 2', 'C', 1, 36, -6.3455900, 106.6922700, 5, 6.6, '2026-08-14 13:20:00', true],
        ];

        foreach ($rooms as [$code, $name, $building, $floor, $capacity, $lat, $lng, $radius, $acc, $setAt, $active]) {
            Room::query()->create([
                'code' => $code,
                'name' => $name,
                'building_id' => $buildings[$building],
                'floor' => $floor,
                'capacity' => $capacity,
                'latitude' => $lat,
                'longitude' => $lng,
                'radius_m' => $radius,
                'point_accuracy_m' => $acc,
                'point_set_at' => $setAt,
                'status' => $active ? ActiveStatus::Active : ActiveStatus::Inactive,
            ]);
        }
    }
}
