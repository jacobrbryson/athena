import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Child } from 'src/app/services/parent';
import { AnimatedCounterComponent } from 'src/app/shared/animated-counter/animated-counter';
import { AnimatedProgressBarComponent } from 'src/app/shared/animated-progress-bar/animated-progress-bar';
import { Avatar } from 'src/app/shared/avatar/avatar';

@Component({
  selector: 'app-parent-child-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    Avatar,
    AnimatedProgressBarComponent,
    AnimatedCounterComponent,
  ],
  template: `
    @if (child; as child) {
    <div>
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-teal-700 flex items-center">
          <app-avatar
            [picture]="child.picture ?? null"
            [full_name]="child.full_name"
            sizeClass="w-9 h-9"
            class="mr-3 flex-shrink-0"
          />
          <span>{{ child.full_name || child.name }}'s Learning Summary</span>
        </h3>

        <button
          class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 flex items-center gap-2"
          (click)="viewProfile.emit()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-eye"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>View Profile</span>
        </button>
      </div>

      @if (child.status === 'pending') {
      <div
        class="mb-6 p-4 rounded-xl border border-yellow-300 bg-yellow-50 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
      >
        <div class="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-yellow-700 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m5-3a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
          <p class="text-sm text-yellow-900 m-0">
            This child has requested access. Approve to link accounts, or deny to remove the
            request.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-2 h-10 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            (click)="actionRequested.emit('approve')"
          >
            Approve
          </button>
          <div class="relative">
            <button
              type="button"
              class="px-3 py-2 h-10 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center"
              (click)="actionMenuToggle.emit()"
              [attr.aria-expanded]="actionMenuOpen"
              aria-haspopup="menu"
              title="More actions"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-x"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            @if (actionMenuOpen) {
            <div
              class="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-30"
              role="menu"
            >
              <button
                type="button"
                class="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                (click)="actionRequested.emit('deny')"
                role="menuitem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-amber-700"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m4.9 4.9 14.2 14.2" />
                </svg>
                Deny
              </button>
              <button
                type="button"
                class="w-full px-3 py-2 text-red-700 hover:bg-red-50 flex items-center gap-2 text-left"
                (click)="actionRequested.emit('block')"
                role="menuitem"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-red-700"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                  <path d="m9.5 9.5 5 5" />
                  <path d="m14.5 9.5-5 5" />
                </svg>
                Block
              </button>
            </div>
            }
          </div>
        </div>
      </div>
      } @if (child.status === 'denied') {
      <div
        class="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-center justify-between gap-3"
      >
        <p class="text-sm">
          This request was denied. You can still change your mind and approve later.
        </p>
        <button
          type="button"
          class="px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
          (click)="actionRequested.emit('approve')"
        >
          Approve
        </button>
      </div>
      }

      <div class="grid md:grid-cols-3 gap-4 mb-6">
        <div class="p-4 bg-teal-50 rounded-xl text-center space-y-2">
          <p class="text-sm text-gray-600">Level</p>
          <div
            class="inline-flex items-center px-3 py-1 rounded-full bg-white text-teal-700 border border-teal-200 font-semibold"
          >
            <app-animated-counter
              [value]="levelValue(child)"
              [duration]="700"
            ></app-animated-counter>
          </div>
          <div class="mt-3">
            <app-animated-progress-bar
              class="w-full"
              [value]="levelProgressValue(child)"
              [duration]="900"
              [height]="8"
              [style.--apb-track]="'#ccfbf1'"
              [style.--apb-fill]="'linear-gradient(90deg, #0d9488 0%, #14b8a6 100%)'"
            ></app-animated-progress-bar>
          </div>
          <p class="text-xs text-gray-500 mt-2">Progress to next level</p>
        </div>
        <div class="p-4 bg-teal-50 rounded-xl text-center">
          <p class="text-sm text-gray-500">Wisdom Points</p>
          <app-animated-counter
            class="text-2xl font-bold text-teal-700"
            [value]="wisdomPointsValue(child)"
            [duration]="900"
          ></app-animated-counter>
          <div
            class="mt-3 flex items-center justify-center gap-3 text-sm font-medium text-teal-700"
          >
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-1.5"
              routerLink="/about"
              fragment="wisdom_points"
              title="Learn more"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-info"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              About
            </button>
            <span class="text-gray-300">|</span>
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              routerLink="/dashboard/store"
              [disabled]="true"
              title="Coming Soon"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-shopping-bag"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Store
            </button>
          </div>
        </div>
        <div class="p-4 bg-teal-50 rounded-xl text-center">
          <p class="text-sm text-gray-500">Mood Indicator</p>
          <p class="text-lg font-semibold text-gray-700">{{ child.mood || 'N/A' }}</p>
          <div
            class="mt-3 flex items-center justify-center gap-3 text-sm font-medium text-teal-700"
          >
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-1.5"
              routerLink="/about"
              fragment="mood_indicator"
              title="Learn more"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-info"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              About
            </button>
            <span class="text-gray-300">|</span>
            <button
              type="button"
              class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              (click)="moodSuggestionsRequested.emit()"
              [disabled]="true"
              title="Coming Soon"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-sparkles"
              >
                <path d="M12 3v2" />
                <path d="M5.22 6.22 6.64 7.64" />
                <path d="M3 12h2" />
                <path d="M5.22 17.78 6.64 16.36" />
                <path d="M12 19v2" />
                <path d="m17.36 16.36 1.42 1.42" />
                <path d="M19 12h2" />
                <path d="m17.36 7.64 1.42-1.42" />
                <path d="M8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
              </svg>
              Suggest
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3">
        <h4 class="text-lg font-bold text-teal-700 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-target w-5 h-5 shrink-0 inline-block"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          Current Learning Goals
        </h4>
        <button
          type="button"
          class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-2"
          (click)="manageGoals.emit()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-edit"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
          </svg>
          Manage
        </button>
      </div>
      <div class="space-y-3">
        @if (child.targets === undefined || child.targets === null) {
        <div
          class="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm animate-pulse"
        >
          Loading goals…
        </div>
        } @else if ((child.targets || []).length === 0) {
        <div class="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          No learning goals yet. Add a goal to guide this learner.
        </div>
        } @else { @for (goal of (child.targets || []); track goal.id) {
        <div
          class="p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center"
        >
          <p class="font-medium text-gray-800">{{ goal.topic }}</p>
          <div class="w-full md:w-1/3 flex items-center mt-2 md:mt-0">
            <app-animated-progress-bar
              class="w-full"
              [value]="goalProgressValue(goal)"
              [duration]="900"
              [height]="8"
              [showValue]="true"
              [style.--apb-track]="'#e2e8f0'"
              [style.--apb-fill]="'linear-gradient(90deg, #14b8a6 0%, #2dd4bf 100%)'"
            ></app-animated-progress-bar>
          </div>
        </div>
        } }
      </div>

      <div class="flex items-center justify-between mt-8 mb-3">
        <h4 class="text-lg font-bold text-teal-700 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-clipboard-list mr-2"
          >
            <path d="M9 12h6" />
            <path d="M9 16h6" />
            <path d="M9 8h6" />
            <path d="M4 6h16v14H4z" />
            <path d="M9 4h6v2H9z" />
          </svg>
          Recent Activity
        </h4>
        <button
          type="button"
          class="px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-2 disabled:opacity-50"
          (click)="viewActivity.emit()"
          [disabled]="!child"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-history"
          >
            <path d="M3 3v5h5" />
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
            <path d="M12 7v5l4 2" />
          </svg>
          View All
        </button>
      </div>
      @if (auditTrailLoading || auditTrail === null || auditTrail === undefined) {
      <div
        class="p-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm animate-pulse"
      >
        Loading activity…
      </div>
      } @else if (!(auditTrail || []).length) {
      <div class="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
        Activity will appear here once this learner starts engaging.
      </div>
      } @else {
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
        @for (entry of auditTrail; track entry.id) {
        <div class="py-3 border-b border-gray-100 last:border-0">
          <p class="text-sm text-gray-800">{{ entry.activity }}</p>
          <p class="text-xs text-gray-500">{{ renderActivityTime(entry.time) }}</p>
        </div>
        }
      </div>
      }
    </div>
    }
  `,
})
export class ParentChildDetailsComponent {
  @Input() child: Child | null = null;
  @Input() auditTrail: any[] | null = null;
  @Input() auditTrailLoading = false;
  @Input() actionMenuOpen = false;
  @Input() formatActivityTime: (value: any) => string = (value: any) => value;

  @Output() viewProfile = new EventEmitter<void>();
  @Output() actionRequested = new EventEmitter<'approve' | 'deny' | 'block'>();
  @Output() actionMenuToggle = new EventEmitter<void>();
  @Output() moodSuggestionsRequested = new EventEmitter<void>();
  @Output() manageGoals = new EventEmitter<void>();
  @Output() viewActivity = new EventEmitter<void>();

  renderActivityTime(time: any) {
    return this.formatActivityTime(time);
  }

  levelValue(child: Child) {
    return this.toNumber(child.level, 1);
  }

  wisdomPointsValue(child: Child) {
    const wisdom = child.wisdom_points ?? child.wisdomPoints ?? 0;
    return this.toNumber(wisdom, 0);
  }

  levelProgressValue(child: Child) {
    const progress = child.level_progress ?? child.avgProgress ?? 0;
    return this.normalizePercent(this.toNumber(progress, 0));
  }

  goalProgressValue(goal: any) {
    return this.normalizePercent(this.toNumber(goal.progress, 0));
  }

  private toNumber(value: any, fallback: number) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/-?\d+(\.\d+)?/);
      const cleaned = match ? match[0] : '';
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  }

  private normalizePercent(value: number) {
    if (value > 0 && value <= 1) {
      return value * 100;
    }
    return value;
  }
}
