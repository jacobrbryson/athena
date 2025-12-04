import { Component, inject, signal } from '@angular/core';
import { ChatService } from 'src/app/services/chat'; // 💡 UPDATED: Import Target interface and ChatService

// 💡 REMOVED: The local Target interface definition is no longer needed

@Component({
  selector: 'app-learning-targets',
  imports: [],
  templateUrl: './learning-targets.html',
  styleUrls: ['./learning-targets.css'],
})
export class LearningTargets {
  private chatService = inject(ChatService); // 💡 UPDATE: Use the wisdomPoints signal from the service
  public wisdomPoints = this.chatService.wisdomPoints;

  animatedWisdomPoints = signal<number>(0); // 💡 UPDATE: Use the learningTargets signal from the service

  public learningTargets = this.chatService.learningTargets;

  constructor() {
    this.animateWisdomPoints();
    // We will rely on the signal update to trigger the progress bar animation
    // But since the signal might be empty initially, we use an effect or manual check.
    // For now, we call it here and rely on Angular change detection to handle the update.
    this.animateProgressBars();
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
  } /** Smoothly animate all progress bars */

  animateProgressBars() {
    const duration = 800;

    // 💡 UPDATE: Read from the service's learningTargets signal
    this.learningTargets().forEach((target) => {
      const initial = 0;
      const final = target.proficiency;
      const start = performance.now();

      const animate = (time: number) => {
        const elapsed = time - start;
        const t = Math.min(elapsed / duration, 1); // Calculate the animated progress fill value
        const newProgressFill = initial + (final - initial) * t; // 💡 UPDATE: Update the local progressFill property of the target object

        // and then update the signal in the service with the modified list.
        this.learningTargets.update((list) =>
          list.map((tgt) =>
            tgt.id === target.id ? { ...tgt, progressFill: newProgressFill } : tgt
          )
        );

        if (t < 1) requestAnimationFrame(animate);
        else {
          // Ensure the final value is set exactly at the end
          this.learningTargets.update((list) =>
            list.map((tgt) => (tgt.id === target.id ? { ...tgt, progressFill: final } : tgt))
          );
        }
      };

      requestAnimationFrame(animate);
    });
  } // Optional methods to update dynamically

  addWisdomPoints(points: number) {
    // 💡 UPDATE: Call the service's method to update the shared state
    this.chatService.addWisdomPoints(points);
    this.animateWisdomPoints();
  }

  updateTargetProficiency(topic_name: string, newProficiency: number) {
    // 💡 UPDATE: Call the service's method to update the shared state
    this.chatService.updateTargetProficiency(topic_name, newProficiency);
    // Re-run the animation to reflect the new proficiency target
    this.animateProgressBars();
  }
}
