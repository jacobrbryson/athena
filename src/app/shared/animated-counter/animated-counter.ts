import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-animated-counter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-counter.html',
  styleUrls: ['./animated-counter.css'],
})
export class AnimatedCounterComponent implements OnInit, OnChanges, OnDestroy {
  /** Final value to animate to. */
  @Input() value = 0;
  /** Duration of the animation in milliseconds. */
  @Input() duration = 900;
  /** Optional starting value; defaults to the current displayed value. */
  @Input() startFrom: number | null = null;

  displayValue = 0;

  private frameId: number | null = null;
  private finalizeTimer: any = null;
  private animationToken = 0;
  private firstStepLoggedFor: number | null = null;
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.animationToken === 0) {
      this.animate();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] || changes['startFrom'] || changes['duration']) {
      this.animate();
    }
  }

  ngOnDestroy(): void {
    this.cancelAnimation();
  }

  private animate(): void {
    this.cancelAnimation();
    const token = ++this.animationToken;
    this.firstStepLoggedFor = null;

    const target = this.coerceNumber(this.value);
    const startValue =
      this.startFrom !== null && this.startFrom !== undefined
        ? this.coerceNumber(this.startFrom)
        : this.displayValue || 0;
    const duration = Math.max(this.duration, 0);

    if (duration === 0 || startValue === target) {
      this.setDisplayValue(target);
      return;
    }

    const startTime = performance.now();

    this.finalizeTimer = setTimeout(() => {
      if (token === this.animationToken) {
        this.setDisplayValue(target);
      }
      this.finalizeTimer = null;
    }, duration + 50);

    const step = (time: number) => {
      const t = Math.min((time - startTime) / duration, 1);
      const eased = this.easeOutCubic(t);
      const next = startValue + (target - startValue) * eased;

      if (token !== this.animationToken) return;

      this.setDisplayValue(Math.round(next));
      if (this.firstStepLoggedFor !== token) {
        this.firstStepLoggedFor = token;
      }

      if (t < 1) {
        this.frameId = requestAnimationFrame(step);
      } else {
        this.finish(target, token);
      }
    };

    this.frameId = requestAnimationFrame(step);
  }

  private finish(target: number, token: number) {
    this.frameId = null;
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }
    if (token !== this.animationToken) return;
    this.setDisplayValue(target);
    // Double clamp in case browser throttles the last frame.
    queueMicrotask(() => {
      if (token === this.animationToken) {
        this.setDisplayValue(target);
      }
    });
  }

  private cancelAnimation() {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    if (this.finalizeTimer) {
      clearTimeout(this.finalizeTimer);
      this.finalizeTimer = null;
    }
  }

  private setDisplayValue(value: number) {
    this.displayValue = value;
    // Ensure Angular sees the change even if rAF is throttled or outside zone.
    this.cdr.markForCheck();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private coerceNumber(value: any): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : 0;
  }
}
