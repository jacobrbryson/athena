import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-parent-child-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-pulse space-y-6">
      <div class="flex items-center justify-between">
        <div class="h-6 w-48 bg-teal-100 rounded"></div>
        <div class="h-10 w-24 bg-gray-100 rounded-lg"></div>
      </div>
      <div class="grid md:grid-cols-3 gap-4">
        @for (_ of [1, 2, 3]; track _) {
        <div class="p-4 bg-teal-50 rounded-xl">
          <div class="h-3 w-24 bg-teal-100 rounded mb-2"></div>
          <div class="h-6 w-12 bg-teal-200 rounded"></div>
        </div>
        }
      </div>
      <div class="space-y-3">
        @for (_ of [1, 2]; track _) {
        <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div class="h-4 w-40 bg-gray-200 rounded mb-3"></div>
          <div class="h-3 w-full bg-gray-100 rounded"></div>
        </div>
        }
      </div>
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
        @for (_ of [1, 2, 3]; track _) {
        <div class="h-4 w-3/4 bg-gray-100 rounded"></div>
        }
      </div>
    </div>
  `,
})
export class ParentChildLoadingComponent {}
