import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-parent-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="text-center p-12 bg-teal-50 border border-teal-200 rounded-xl flex flex-col items-center justify-center"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-user-circle text-teal-400 mb-4"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="10" r="3" />
        <path d="M12 14a4 4 0 0 0 4 4H8a4 4 0 0 0 4-4Z" />
      </svg>
      <p class="text-lg font-semibold text-teal-700 mb-2">Select a Child</p>
      <p class="text-gray-500">
        Choose a child from the list to view their learning insights and audit trail.
      </p>
    </div>
  `,
})
export class ParentEmptyStateComponent {}
