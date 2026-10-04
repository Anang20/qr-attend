<?php

namespace App\Services;

use App\Enums\DeviceStatus;
use App\Models\Device;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;

/**
 * Ikat perangkat (BR-07): akun mahasiswa hanya sah presensi dari satu perangkat.
 *
 * Identitas perangkat = cookie acak yang dibuat server (httpOnly + terenkripsi Laravel),
 * disimpan di database hanya sebagai hash. Bukan jaminan mutlak (lihat BRD Risiko R-02),
 * tetapi cukup untuk mencegah titip absen lewat akun di ponsel orang lain.
 */
final class DeviceBinding
{
    public const COOKIE = 'qra_device';

    private const COOKIE_MINUTES = 60 * 24 * 365 * 5;

    /** Dipanggil saat mahasiswa masuk: pastikan perangkat punya cookie & ikat bila belum ada perangkat. */
    public static function onLogin(User $user, Request $request): void
    {
        $deviceId = $request->cookie(self::COOKIE);

        if (! is_string($deviceId) || strlen($deviceId) < 32) {
            $deviceId = Str::random(48);
            // Cookie Laravel: terenkripsi & httpOnly secara bawaan.
            Cookie::queue(self::COOKIE, $deviceId, self::COOKIE_MINUTES);
        }

        $hasActive = $user->devices()->where('status', DeviceStatus::Active)->exists();
        if (! $hasActive) {
            $agent = (string) $request->userAgent();
            Device::query()->create([
                'user_id' => $user->id,
                'fingerprint_hash' => hash('sha256', $deviceId),
                'device_name' => self::deviceName($agent),
                'platform' => self::platform($agent),
                'bound_at' => now(),
                'status' => DeviceStatus::Active,
            ]);
        }
    }

    /** Perangkat terikat yang cocok dengan cookie permintaan ini, atau null. */
    public static function matchingDevice(User $user, Request $request): ?Device
    {
        $deviceId = $request->cookie(self::COOKIE);
        if (! is_string($deviceId) || $deviceId === '') {
            return null;
        }

        return $user->devices()
            ->where('status', DeviceStatus::Active)
            ->where('fingerprint_hash', hash('sha256', $deviceId))
            ->first();
    }

    public static function activeDevice(User $user): ?Device
    {
        return $user->devices()->where('status', DeviceStatus::Active)->latest('bound_at')->first();
    }

    /** Admin mencabut perangkat aktif; perangkat berikutnya yang masuk akan diikat. */
    public static function revoke(User $user): int
    {
        return $user->devices()
            ->where('status', DeviceStatus::Active)
            ->update(['status' => DeviceStatus::Revoked->value, 'revoked_at' => now()]);
    }

    private static function platform(string $agent): string
    {
        return match (true) {
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'iPhone'), str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Mac OS') => 'macOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => 'Lainnya',
        };
    }

    private static function deviceName(string $agent): string
    {
        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') => 'Opera',
            str_contains($agent, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($agent, 'Firefox/') => 'Firefox',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Safari/') => 'Safari',
            default => 'Browser',
        };

        return $browser.' · '.self::platform($agent);
    }
}
