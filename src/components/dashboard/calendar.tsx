'use client';

import React, { useMemo, useState } from 'react';
import {
  addMonths,
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type Task = {
  id: string;
  name: string;
  description: string;
  /**
   * Formatted like "09:00" or "09:00-10:30". If you need stricter typing,
   * split into startTime / endTime.
   */
  time: string;
  /** ISO string */
  dueDate: string;
};

/* -------------------------------------------------------------------------- */
/*                              Helper hooks                                   */
/* -------------------------------------------------------------------------- */

function useTasksByDay(tasks: Task[]) {
  return useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      const key = format(parseISO(t.dueDate), 'yyyy-MM-dd');
      (map[key] ||= []).push(t);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.time.localeCompare(b.time))
    );
    return map;
  }, [tasks]);
}

/* -------------------------------------------------------------------------- */
/*                               Calendar core                                */
/* -------------------------------------------------------------------------- */

function MonthView({ tasks }: { tasks: Task[] }) {
  const tasksByDay = useTasksByDay(tasks);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const first = startOfMonth(currentMonth);
  const last = endOfMonth(currentMonth);

  const days = eachDayOfInterval({
    start: startOfWeek(first, { weekStartsOn: 1 }),
    end: endOfWeek(last, { weekStartsOn: 1 }),
  });

  /* --------------------------------- UI ---------------------------------- */

  return (
    <Card className="w-full border-muted/60">
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          <CardTitle className="text-lg lg:text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </CardTitle>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday header */}
        <div className="grid grid-cols-7 text-xs lg:text-sm font-medium text-muted-foreground select-none">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="py-2 text-center border-b border-muted/30">
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 auto-rows-[minmax(6rem,auto)] lg:auto-rows-[minmax(8rem,auto)] gap-px bg-muted/30">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());
            const outside = !isSameMonth(day, currentMonth);
            const dayTasks = tasksByDay[key] || [];

            const overflow = dayTasks.length > 3 ? dayTasks.length - 3 : 0;
            const visibleTasks = dayTasks.slice(0, 3);

            return (
              <div
                key={key}
                className={cn(
                  'relative flex flex-col p-1.5 lg:p-2 bg-background',
                  outside && 'bg-muted/10 text-muted-foreground',
                  isToday && 'ring-2 ring-primary/60'
                )}
                onClick={() => dayTasks.length && setSelectedDayKey(key)}
              >
                {/* Date number */}
                <span className="text-[0.65rem] lg:text-xs font-semibold mb-1">
                  {format(day, 'd')}
                </span>

                {/* Tasks */}
                <div className="flex flex-col gap-0.5 grow overflow-hidden">
                  {visibleTasks.map((t) => (
                  <div
                    key={t.id}
                    className="truncate rounded-sm px-1.5 py-0.5 text-[0.55rem] lg:text-xs leading-tight bg-primary/10 text-primary cursor-pointer"
                  >
                    {t.name}
                        </div>
                            ))}
                  {overflow > 0 && (
                    <span className="text-[0.55rem] lg:text-xs text-muted-foreground">
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Detail dialog */}
      <Dialog open={!!selectedDayKey} onOpenChange={() => setSelectedDayKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDayKey && format(parseISO(selectedDayKey), 'EEEE, dd MMMM yyyy')}
            </DialogTitle>
            <DialogDescription>All tasks for this date</DialogDescription>
          </DialogHeader>
          {selectedDayKey && (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {tasksByDay[selectedDayKey]!.map((t) => (
                <Card key={t.id} className="hover:bg-muted cursor-pointer">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-base lg:text-lg font-semibold">
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {t.description}
                    </p>
                    {t.time && (
                      <p className="text-sm mt-2 font-medium">{t.time}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Exported panels                               */
/* -------------------------------------------------------------------------- */

/** Sidebar‑friendly month view */
export const CalendarPanel = ({ tasks }: { tasks: Task[] }) => (
  <MonthView tasks={tasks} />
);

/** Simple task list (unchanged) */
export const TaskPanel = ({ tasks }: { tasks: Task[] }) => (
  <Card className="w-full border-muted/60">
    <CardHeader>
      <CardTitle>Your Tasks</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      {tasks.map((t) => (
        <Card key={t.id} className="border-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold truncate">
              {t.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {t.time && <p className="text-xs font-medium mb-1">{t.time}</p>}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {t.description}
            </p>
            <p className="text-sm mt-2 font-medium">
              {format(parseISO(t.dueDate), 'dd MMM yyyy')}
            </p>
          </CardContent>
        </Card>
      ))}
    </CardContent>
  </Card>
);
