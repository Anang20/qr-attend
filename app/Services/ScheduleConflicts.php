<?php

namespace App\Services;

use App\Models\ClassSchedule;
use Illuminate\Support\Collection;

/**
 * BR-20: bentrok bila periode sama, hari sama, jam beririsan,
 * dan (kelas sama ATAU dosen sama ATAU ruang sama).
 */
final class ScheduleConflicts
{
    /**
     * @param  array{academic_period_id: int, class_group_id: int, lecturer_id: int, room_id: int, day_of_week: int, start_time: string, end_time: string}  $slot
     * @return array{class: ?string, lecturer: ?string, room: ?string}
     */
    public static function find(array $slot, ?int $ignoreId = null): array
    {
        /** @var Collection<int, ClassSchedule> $overlaps */
        $overlaps = ClassSchedule::query()
            ->with(['course:id,name', 'classGroup:id,code'])
            ->where('academic_period_id', $slot['academic_period_id'])
            ->where('day_of_week', $slot['day_of_week'])
            ->when($ignoreId, fn ($q, int $id) => $q->whereKeyNot($id))
            ->where('start_time', '<', $slot['end_time'])
            ->where('end_time', '>', $slot['start_time'])
            ->where(fn ($q) => $q
                ->where('class_group_id', $slot['class_group_id'])
                ->orWhere('lecturer_id', $slot['lecturer_id'])
                ->orWhere('room_id', $slot['room_id']))
            ->get();

        $describe = fn (?ClassSchedule $s): ?string => $s
            ? $s->course->name.' ('.$s->classGroup->code.', '.substr((string) $s->start_time, 0, 5).'–'.substr((string) $s->end_time, 0, 5).')'
            : null;

        return [
            'class' => $describe($overlaps->firstWhere('class_group_id', $slot['class_group_id'])),
            'lecturer' => $describe($overlaps->firstWhere('lecturer_id', $slot['lecturer_id'])),
            'room' => $describe($overlaps->firstWhere('room_id', $slot['room_id'])),
        ];
    }
}
