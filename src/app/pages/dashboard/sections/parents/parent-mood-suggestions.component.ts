import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type MoodSuggestion = { title: string; body: string };

@Component({
  selector: 'app-parent-mood-suggestions',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
    <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm uppercase tracking-wide text-teal-600 font-semibold m-0">
              AI suggestions
            </p>
            <h3 class="text-xl font-bold text-gray-900 m-0">Mood-based tips</h3>
          </div>
          <button
            type="button"
            class="text-gray-500 hover:text-gray-700"
            aria-label="Close"
            (click)="close.emit()"
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
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-600 m-0">
          Based on recent activity, here are quick actions you can take to improve engagement.
        </p>
        <div class="space-y-3">
          @for (item of suggestions; track item.title) {
          <div class="p-4 rounded-xl border border-gray-200">
            <p class="font-semibold text-gray-800 mb-1">{{ item.title }}</p>
            <p class="text-sm text-gray-600 m-0">{{ item.body }}</p>
          </div>
          }
        </div>
        <div class="flex justify-end">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            (click)="close.emit()"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
    }
  `,
})
export class ParentMoodSuggestionsComponent {
  @Input() open = false;
  @Input() suggestions: MoodSuggestion[] = [];

  @Output() close = new EventEmitter<void>();
}
