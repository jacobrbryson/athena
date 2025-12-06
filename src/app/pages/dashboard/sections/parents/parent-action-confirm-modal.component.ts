import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type PendingAction = { type: 'approve' | 'deny' | 'block'; childName: string };

@Component({
  selector: 'app-parent-action-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (pending; as pendingAction) {
    <div class="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-2">
          Confirm
          {{
            pendingAction.type === 'approve'
              ? 'Approval'
              : pendingAction.type === 'deny'
              ? 'Denial'
              : 'Block'
          }}
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Are you sure you want to
          {{
            pendingAction.type === 'approve'
              ? 'approve'
              : pendingAction.type === 'deny'
              ? 'deny'
              : 'block'
          }}
          {{ pendingAction.childName }}? A confirmation from a guardian is required before they can
          access this app.
        </p>
        <div class="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            (click)="cancel.emit()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg text-white"
            [ngClass]="{
              'bg-teal-600 hover:bg-teal-700': pendingAction.type === 'approve',
              'bg-amber-600 hover:bg-amber-700': pendingAction.type === 'deny',
              'bg-red-600 hover:bg-red-700': pendingAction.type === 'block'
            }"
            (click)="confirm.emit()"
          >
            {{
              pendingAction.type === 'approve' ? 'Approve' : pendingAction.type === 'deny'
                ? 'Deny'
                : 'Block'
            }}
          </button>
        </div>
      </div>
    </div>
    }
  `,
})
export class ParentActionConfirmModalComponent {
  @Input() pending: PendingAction | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}
