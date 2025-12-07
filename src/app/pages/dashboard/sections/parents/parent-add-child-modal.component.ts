import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GRADE_OPTIONS, GradeValue } from 'src/app/shared/constants/grades';

type EditableChild = {
	full_name: string;
	email: string;
	birthday: string;
	grade: GradeValue | '';
	profile_editing_locked: boolean;
};

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
              maxlength="255"
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
              maxlength="255"
            />
            <p class="mt-1 text-xs text-gray-500">Email must be a valid Google account.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
            <input
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              [value]="child.birthday"
              (input)="handleChange('birthday', $any($event.target).value)"
              [attr.min]="birthdayMin"
              [attr.max]="birthdayMax"
            />
            <p class="mt-1 text-xs text-gray-500">
              Child must be between 5 and 18 years old.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Grade (optional)</label>
            <select
              class="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              [value]="child.grade || ''"
              (change)="handleChange('grade', $any($event.target).value)"
            >
              <option value="">Select a grade</option>
              <option *ngFor="let option of gradeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
            <p class="mt-1 text-xs text-gray-500">We use grade to personalize learning goals.</p>
          </div>
          <div class="flex items-start justify-between rounded-lg border border-gray-200 p-3 bg-gray-50">
            <div class="mr-3">
              <p class="text-sm font-medium text-gray-800 flex items-center gap-2">
                Lock profile editing by child
                <span
                  class="text-gray-400 cursor-help"
                  title="Prevents changing name, birthday, or grade from the child's account."
                  aria-label="Lock profile help"
                >
                  &#9432;
                </span>
              </p>
              <p class="text-xs text-gray-500">
                Enabled by default to keep details consistent. You can change this later.
              </p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                [checked]="child.profile_editing_locked"
                (change)="handleChange('profile_editing_locked', $any($event.target).checked)"
              />
              <div
                class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-teal-600 transition"
              >
                <div
                  class="absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transform transition peer-checked:translate-x-4"
                ></div>
              </div>
            </label>
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
            [disabled]="!isFormValid"
            [class.opacity-60]="!isFormValid"
            [class.cursor-not-allowed]="!isFormValid"
            (click)="handleSave()"
          >
            Save
          </button>
        </div>
  </div>
    </div>
  `,
})
export class ParentAddChildModalComponent {
  @Input() child: EditableChild = {
	full_name: '',
	email: '',
	birthday: '',
	grade: '',
	profile_editing_locked: true,
  };

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
  @Output() fieldChange = new EventEmitter<{
	field: keyof EditableChild;
	value: string | boolean;
  }>();

  gradeOptions = GRADE_OPTIONS;

  get isNameValid(): boolean {
    const name = (this.child.full_name || '').trim();
    return !!name && name.length <= 255;
  }

  get isEmailValid(): boolean {
    const email = (this.child.email || '').trim();
    if (!email || email.length > 255) return false;
    // Basic email validation pattern; keeps client-side check lightweight.
    const pattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return pattern.test(email);
  }

  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid;
  }

  get birthdayMin(): string {
    // Oldest allowed: up to 18 years ago.
    return this.shiftYears(-18);
  }

  get birthdayMax(): string {
    // Youngest allowed: at least 5 years ago.
    return this.shiftYears(-5);
  }

  handleChange(field: keyof EditableChild, value: string | boolean) {
    if (field === 'grade' && typeof value === 'string') {
      this.fieldChange.emit({ field, value: (value as GradeValue) || '' });
      return;
    }
    this.fieldChange.emit({ field, value });
  }

  handleSave() {
    if (!this.isFormValid) return;
    this.save.emit();
  }

  private shiftYears(deltaYears: number): string {
    const now = new Date();
    const shifted = new Date(now);
    shifted.setFullYear(now.getFullYear() + deltaYears);
    return shifted.toISOString().split('T')[0];
  }
}
