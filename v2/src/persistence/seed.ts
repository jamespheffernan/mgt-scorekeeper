/**
 * First-run seeding — the Millbrook course is always present so the app is
 * usable out of the box, even before the player has imported anything.
 */

import { db } from './db';
import { millbrookCourse } from '@/courses/millbrook';

let seeded = false;

export async function seedOnce(): Promise<void> {
  if (seeded) return;
  const existing = await db.courses.get(millbrookCourse.id);
  if (!existing) {
    await db.courses.put(millbrookCourse);
  }
  seeded = true;
}
