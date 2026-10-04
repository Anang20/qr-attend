<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Paginasi server untuk baris yang dihitung di PHP (rekap, status kelayakan, urutan waktu presensi),
 * sehingga tidak bisa langsung memakai ->paginate() Eloquent. Bentuk keluarannya sama dengan Paginated<T> di TS.
 */
final class Paginate
{
    /** @param Collection<int|string, mixed> $items */
    public static function collection(Collection $items, Request $request): LengthAwarePaginator
    {
        $perPage = PerPage::from($request);
        $page = max(1, $request->integer('page', 1));
        $lastPage = max(1, (int) ceil($items->count() / $perPage));

        return new LengthAwarePaginator(
            $items->forPage(min($page, $lastPage), $perPage)->values(),
            $items->count(),
            $perPage,
            min($page, $lastPage),
            ['path' => $request->url(), 'query' => $request->query()],
        );
    }
}
