import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Child } from 'src/app/services/parent';
import { Avatar } from 'src/app/shared/avatar/avatar';

@Component({
  selector: 'app-parent-child-list',
  standalone: true,
  imports: [CommonModule, Avatar],
  template: `
    <div class="bg-teal-50 p-6 rounded-2xl shadow-inner">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-teal-700 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-users mr-2"
          >
            <path d="M14 19a6 6 0 0 0-12 0" />
            <circle cx="8" cy="10" r="4" />
            <path d="M20 21v-2a4 4 0 0 0-4-4h-4" />
            <circle cx="16" cy="10" r="4" />
          </svg>
          Manage Children
        </h3>
        <button
          type="button"
          (click)="onAddChild()"
          class="ml-3 px-3 py-2 text-sm font-medium text-teal-700 rounded-lg hover:bg-teal-50 inline-flex items-center gap-2 shadow-sm border border-teal-200"
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
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>Add Child</span>
        </button>
      </div>

      <div class="space-y-2 max-h-96 overflow-y-auto">
        @if (loading) {
        <div class="space-y-3">
          @for (_ of [1, 2, 3]; track _) {
          <div
            class="p-4 rounded-xl border-2 bg-white border-teal-100 animate-pulse flex justify-between items-center"
          >
            <div class="flex-1 space-y-2">
              <div class="h-4 w-2/3 bg-teal-100 rounded"></div>
              <div class="h-3 w-1/3 bg-gray-100 rounded"></div>
            </div>
            <div class="h-6 w-16 bg-teal-100 rounded-full"></div>
          </div>
          }
        </div>
        } @else if ((children || []).length === 0) {
        <div class="p-4 bg-white border-2 border-dashed border-teal-200 rounded-xl text-center">
          <p class="text-sm text-teal-700 font-semibold mb-1">No children yet</p>
          <p class="text-xs text-gray-500 mb-3">
            Add a child to link accounts and start seeing their learning insights.
          </p>
          <button
            type="button"
            class="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
            (click)="onAddChild()"
          >
            Add Child
          </button>
        </div>
        } @else { @for (child of children; track child.id) {
        <button
          (click)="onSelectChild(child.id)"
          class="w-full text-left p-4 rounded-xl border-2 transition duration-200 ease-in-out flex justify-between items-center"
          [ngClass]="{
            'bg-white border-teal-500': selectedChildId === child.id,
            'bg-teal-100 border-transparent': selectedChildId !== child.id,
            'border-yellow-400 bg-yellow-50': child.status === 'pending'
          }"
        >
          <div class="flex-1 flex items-center gap-3">
            <app-avatar
              [picture]="child.picture ?? ''"
              [full_name]="child.full_name"
              sizeClass="w-9 h-9"
              class="flex-shrink-0"
            />
            <div>
              <p class="font-semibold text-teal-800 flex items-center gap-2">
                {{ child.full_name || child.name }}
              </p>
              <p class="text-sm text-gray-500">{{ child.gradeLevel }}</p>
            </div>
          </div>
          <span
            class="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
            [ngClass]="{
              'bg-red-100 text-red-700 border border-red-200': child.status === 'denied',
              'bg-teal-500 text-white': selectedChildId === child.id && child.status !== 'denied',
              'bg-teal-200 text-teal-700': selectedChildId !== child.id && child.status !== 'denied'
            }"
          >
            {{ child.status === 'denied' ? 'Denied' : (child.targets?.length || 0) + ' Goals' }}
          </span>
        </button>
        } }
      </div>
    </div>
  `,
})
export class ParentChildListComponent {
  @Input() children: Child[] = [];
  @Input() selectedChildId: number | null = null;
  @Input() loading = false;

  @Output() selectChild = new EventEmitter<number>();
  @Output() addChild = new EventEmitter<void>();

  onSelectChild(id: number) {
    this.selectChild.emit(id);
  }

  onAddChild() {
    this.addChild.emit();
  }
}
