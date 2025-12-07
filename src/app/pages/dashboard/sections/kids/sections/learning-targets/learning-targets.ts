import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ChatService } from 'src/app/services/chat'; // dY'­ UPDATED: Import Target interface and ChatService
import { AnimatedProgressBarComponent } from 'src/app/shared/animated-progress-bar/animated-progress-bar';

// dY'­ REMOVED: The local Target interface definition is no longer needed

@Component({
  selector: 'app-learning-targets',
  standalone: true,
  imports: [CommonModule, AnimatedProgressBarComponent],
  templateUrl: './learning-targets.html',
  styleUrls: ['./learning-targets.css'],
})
export class LearningTargets {
  private chatService = inject(ChatService); // dY'­ UPDATE: Use the wisdomPoints signal from the service
  public wisdomPoints = this.chatService.wisdomPoints;

  animatedWisdomPoints = signal<number>(0); // dY'­ UPDATE: Use the learningTargets signal from the service

  public learningTargets = this.chatService.learningTargets;

  constructor() {
    this.animateWisdomPoints();
  } /** Smoothly animate wisdom points using requestAnimationFrame */

  animateWisdomPoints() {
    const duration = 1000; // total duration in ms
    const start = performance.now();
    const initial = this.animatedWisdomPoints();
    const target = this.wisdomPoints();

    const animate = (time: number) => {
      const elapsed = time - start;
      const t = Math.min(elapsed / duration, 1); // normalized 0..1
      const value = initial + (target - initial) * t; // linear interpolation
      this.animatedWisdomPoints.set(Math.floor(value));

      if (t < 1) requestAnimationFrame(animate);
      else this.animatedWisdomPoints.set(target); // ensure exact final value
    };

    requestAnimationFrame(animate);
  } // Optional methods to update dynamically

  addWisdomPoints(points: number) {
    // dY'­ UPDATE: Call the service's method to update the shared state
    this.chatService.addWisdomPoints(points);
    this.animateWisdomPoints();
  }

  updateTargetProficiency(topic_name: string, newProficiency: number) {
    // dY'­ UPDATE: Call the service's method to update the shared state
    this.chatService.updateTargetProficiency(topic_name, newProficiency);
  }
}

