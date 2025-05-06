import { Course, TeeOption, HoleInfo, Gender } from './courseModel';

/**
 * Creates a valid HoleInfo object
 */
const createHoleInfo = (number: number, par: number, yardage: number, strokeIndex: number): HoleInfo => {
  return {
    number,
    par,
    yardage,
    strokeIndex
  };
};

/**
 * Millbrook Golf & Tennis Club course data
 * Data from the official rulebook
 */
export const MILLBROOK_COURSE_DATA: Course = {
  id: crypto.randomUUID(),
  name: "Millbrook Golf & Tennis Club",
  location: "Millbrook, NY",
  teeOptions: [
    {
      id: crypto.randomUUID(),
      name: "Championship",
      color: "White/Blue",
      gender: "M" as Gender,
      rating: 72.0,
      slope: 133,
      holes: [
        createHoleInfo(1, 5, 497, 7),
        createHoleInfo(2, 3, 190, 9),
        createHoleInfo(3, 5, 518, 5),
        createHoleInfo(4, 4, 289, 13),
        createHoleInfo(5, 4, 379, 3),
        createHoleInfo(6, 5, 441, 11),
        createHoleInfo(7, 3, 163, 17),
        createHoleInfo(8, 4, 386, 1),
        createHoleInfo(9, 3, 151, 15),
        createHoleInfo(10, 5, 485, 6),
        createHoleInfo(11, 3, 190, 12),
        createHoleInfo(12, 5, 498, 8),
        createHoleInfo(13, 4, 320, 4),
        createHoleInfo(14, 4, 328, 16),
        createHoleInfo(15, 4, 389, 2),
        createHoleInfo(16, 3, 150, 18),
        createHoleInfo(17, 4, 343, 14),
        createHoleInfo(18, 3, 207, 10)
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "Member",
      color: "Blue/Green",
      gender: "M" as Gender,
      rating: 70.2,
      slope: 129,
      holes: [
        createHoleInfo(1, 5, 485, 7),
        createHoleInfo(2, 3, 190, 9),
        createHoleInfo(3, 5, 498, 5),
        createHoleInfo(4, 4, 320, 13),
        createHoleInfo(5, 4, 328, 3),
        createHoleInfo(6, 4, 389, 11),
        createHoleInfo(7, 3, 150, 17),
        createHoleInfo(8, 4, 343, 1),
        createHoleInfo(9, 3, 207, 15),
        createHoleInfo(10, 5, 455, 6),
        createHoleInfo(11, 3, 177, 12),
        createHoleInfo(12, 5, 473, 8),
        createHoleInfo(13, 4, 218, 4),
        createHoleInfo(14, 4, 328, 16),
        createHoleInfo(15, 4, 325, 2),
        createHoleInfo(16, 3, 140, 18),
        createHoleInfo(17, 4, 291, 14),
        createHoleInfo(18, 3, 151, 10)
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "Senior",
      color: "Green/Silver",
      gender: "Any" as Gender,
      rating: 68.5,
      slope: 126,
      holes: [
        createHoleInfo(1, 5, 455, 7),
        createHoleInfo(2, 3, 177, 9),
        createHoleInfo(3, 5, 473, 5),
        createHoleInfo(4, 4, 218, 13),
        createHoleInfo(5, 4, 328, 3),
        createHoleInfo(6, 4, 325, 11),
        createHoleInfo(7, 3, 140, 17),
        createHoleInfo(8, 4, 291, 1),
        createHoleInfo(9, 3, 151, 15),
        createHoleInfo(10, 5, 455, 6),
        createHoleInfo(11, 3, 140, 12),
        createHoleInfo(12, 5, 414, 8),
        createHoleInfo(13, 4, 218, 4),
        createHoleInfo(14, 4, 228, 16),
        createHoleInfo(15, 4, 325, 2),
        createHoleInfo(16, 3, 125, 18),
        createHoleInfo(17, 4, 295, 14),
        createHoleInfo(18, 3, 190, 10)
      ]
    },
    {
      id: crypto.randomUUID(),
      name: "Forward",
      color: "Red/Gold",
      gender: "F" as Gender,
      rating: 69.2,
      slope: 118,
      holes: [
        createHoleInfo(1, 5, 455, 3),
        createHoleInfo(2, 3, 139, 15),
        createHoleInfo(3, 5, 414, 5),
        createHoleInfo(4, 4, 218, 13),
        createHoleInfo(5, 4, 232, 11),
        createHoleInfo(6, 5, 389, 7),
        createHoleInfo(7, 3, 109, 17),
        createHoleInfo(8, 4, 291, 1),
        createHoleInfo(9, 3, 140, 9),
        createHoleInfo(10, 5, 485, 2),
        createHoleInfo(11, 3, 177, 10),
        createHoleInfo(12, 4, 296, 16),
        createHoleInfo(13, 3, 145, 18),
        createHoleInfo(14, 4, 328, 6),
        createHoleInfo(15, 5, 325, 4),
        createHoleInfo(16, 3, 140, 8),
        createHoleInfo(17, 5, 343, 14),
        createHoleInfo(18, 4, 207, 12)
      ]
    }
  ]
}; 