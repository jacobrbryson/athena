import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type EditableChild = { full_name: string; email: string; birthday: string };

@Component({
  selector: 'app-parent-add-child-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-teal-700">Add Child</h3>
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
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              [value]="child.full_name"
              (input)="handleChange('full_name', $any($event.target).value)"
              placeholder="e.g., Alex Johnson"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              [value]="child.email"
              (input)="handleChange('email', $any($event.target).value)"
              placeholder="child@example.com"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
            <input
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              [value]="child.birthday"
              (input)="handleChange('birthday', $any($event.target).value)"
            />
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            (click)="close.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
            (click)="save.emit()"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ParentAddChildModalComponent {
  @Input() child: EditableChild = { full_name: '', email: '', birthday: '' };

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() fieldChange = new EventEmitter<{ field: keyof EditableChild; value: string }>();

  handleChange(field: keyof EditableChild, value: string) {
    this.fieldChange.emit({ field, value });
  }
}
