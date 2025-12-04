import { Component } from '@angular/core';

@Component({
  selector: 'app-teachers',
  standalone: true,
  templateUrl: './teachers.html',
  styleUrls: ['./teachers.css'],
})
export class Teachers {
  classrooms = [
    {
      id: 1,
      name: 'Grade 3A',
      studentCount: 24,
      progress: 68,
      topStudent: 'Liam Chen',
      needsReview: 3,
    },
    {
      id: 2,
      name: 'Grade 3B',
      studentCount: 22,
      progress: 74,
      topStudent: 'Sophia Patel',
      needsReview: 2,
    },
    {
      id: 3,
      name: 'Grade 4A',
      studentCount: 25,
      progress: 81,
      topStudent: 'Ethan Garcia',
      needsReview: 1,
    },
    {
      id: 4,
      name: 'Grade 5A',
      studentCount: 21,
      progress: 77,
      topStudent: 'Olivia Brown',
      needsReview: 4,
    },
    {
      id: 5,
      name: 'Grade 6A',
      studentCount: 26,
      progress: 70,
      topStudent: 'Noah Wilson',
      needsReview: 5,
    },
    {
      id: 6,
      name: 'Grade 7A',
      studentCount: 24,
      progress: 65,
      topStudent: 'Ava Thompson',
      needsReview: 6,
    },
  ];
}
