<?php

namespace App\Services;

/**
 * Perhitungan jarak di permukaan bumi.
 */
final class Geo
{
    private const EARTH_RADIUS_M = 6_371_000;

    /**
     * Jarak dua koordinat dalam meter (rumus Haversine).
     * Akurat untuk jarak pendek di dalam kampus (galat < 0,5%).
     */
    public static function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $dPhi = deg2rad($lat2 - $lat1);
        $dLambda = deg2rad($lng2 - $lng1);

        $a = sin($dPhi / 2) ** 2 + cos($phi1) * cos($phi2) * sin($dLambda / 2) ** 2;

        return 2 * self::EARTH_RADIUS_M * atan2(sqrt($a), sqrt(1 - $a));
    }
}
