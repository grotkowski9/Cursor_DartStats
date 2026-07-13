import type { N01Match } from "@/lib/n01-parser";

/** Godziny aktywności demo: 12:00–01:59 */
export const DEMO_ACTIVE_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1];

export type DemoDateSlot = {
  daysAgo: number;
  hour: number;
  minute: number;
};

/** 3×16–17, 3×17–18, 1×19–20, 2×20–21, 1×21–22 */
const DEMO_TIME_SLOTS: { hour: number; minute: number }[] = [
  { hour: 16, minute: 10 },
  { hour: 16, minute: 35 },
  { hour: 16, minute: 55 },
  { hour: 17, minute: 5 },
  { hour: 17, minute: 30 },
  { hour: 17, minute: 50 },
  { hour: 19, minute: 15 },
  { hour: 20, minute: 10 },
  { hour: 20, minute: 45 },
  { hour: 21, minute: 20 },
];

/**
 * Stałe offsety w dniach wstecz (demo001 → 10d, demo002 → 13d, …).
 * Rozkład w filtrach: 30d=3, 90d=5, 180d=8, 365d=10, all=10.
 */
export const DEMO_DAYS_AGO = [10, 13, 28, 50, 58, 100, 120, 124, 190, 220] as const;

export function buildDemoDateSlots(count: number): DemoDateSlot[] {
  if (count === 0) return [];

  const slots: DemoDateSlot[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = DEMO_DAYS_AGO[i] ?? DEMO_DAYS_AGO[DEMO_DAYS_AGO.length - 1];
    const time = DEMO_TIME_SLOTS[i % DEMO_TIME_SLOTS.length];
    slots.push({
      daysAgo,
      hour: time.hour,
      minute: time.minute,
    });
  }
  return slots;
}

/** Nadpisuje startTime/updateTime względem „teraz”, zachowując kolejność meczów. */
export function applyDemoDates(matches: N01Match[], now = new Date()): N01Match[] {
  const sorted = [...matches].sort(
    (a, b) => a.shareToken.localeCompare(b.shareToken) || a.startTime - b.startTime,
  );
  const slots = buildDemoDateSlots(sorted.length);

  return sorted.map((match, index) => {
    const slot = slots[index];
    const date = new Date(now);
    date.setDate(date.getDate() - slot.daysAgo);
    date.setHours(slot.hour, slot.minute, 0, 0);

    const startTime = Math.floor(date.getTime() / 1000);
    return {
      ...match,
      startTime,
      updateTime: startTime + 3600,
    };
  });
}
