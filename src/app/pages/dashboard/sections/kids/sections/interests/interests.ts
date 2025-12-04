import { Component, inject, signal } from '@angular/core';
import { ChatService, Lesson } from 'src/app/services/chat';

@Component({
  selector: 'app-interests',
  imports: [],
  templateUrl: './interests.html',
  styleUrl: './interests.css',
})
export class Interests {
  private chatService = inject(ChatService);

  recentLessons = this.chatService.recentLessons;

  athenaInterests = signal<string[]>(['Math', 'Science', 'History', 'Grammar']);

  addLesson(lesson: Lesson) {
    this.chatService.addLesson(lesson);
  }

  addInterest(interest: string) {
    this.athenaInterests.update((list) => [...list, interest]);
  }
}
