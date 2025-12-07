import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-animated-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-progress-bar.html',
  styleUrls: ['./animated-progress-bar.css'],
})
export class AnimatedProgressBarComponent implements OnChanges, OnDestroy {
  /** Target percentage for the bar (0-100). */
  @Input() value = 0;
  /** Duration of the animation in milliseconds. */
  @Input() duration = 800;
  /** Optional label rendered to the left of the bar. */
  @Input() label = '';
  /** Show a numeric percentage to the right of the bar. */
  @Input() showValue = false;
  /** Additional classes applied to the track element. */
  @Input() trackClass = '';
  /** Additional classes applied to the fill element. */
  @Input() fillClass = '';
  /** Height of the bar in pixels. */
  @Input() height = 8;
  /** Toggle rounded corners for the track and fill. */
  @Input() rounded = true;

  animatedValue = signal(0);

  private frameId: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.animateToTarget();
    }
  }

  ngOnDestroy(): void {
    this.cancelAnimation();
  }

  private animateToTarget(): void {
    this.cancelAnimation();

    const startValue = this.animatedValue();
    const target = this.clamp(this.value);
    const duration = Math.max(this.duration, 0);

    if (duration === 0) {
      this.animatedValue.set(target);
      return;
    }

    const startTime = performance.now();

    const step = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      const eased = this.easeOutCubic(t);
      const next = startValue + (target - startValue) * eased;

      this.animatedValue.set(next);

      if (t < 1) {
        this.frameId = requestAnimationFrame(step);
      } else {
        this.animatedValue.set(target);
        this.frameId = null;
      }
    };

    this.frameId = requestAnimationFrame(step);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private clamp(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(100, Math.max(0, numeric));
  }

  private cancelAnimation(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }
}

