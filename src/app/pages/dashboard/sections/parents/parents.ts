import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ParentService } from 'src/app/services/parent';
import { Child } from 'src/app/services/parent';

@Component({
  selector: 'app-parents',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './parents.html',
  styleUrls: ['./parents.css'],
})
export class Parents implements OnInit {
  private parentService = inject(ParentService);
  private router = inject(Router);
  children = this.parentService.children;
  selectedChildId = signal<number | null>(null);
  showAddChildModal = signal(false);
  actionMenuOpen = signal(false);
  pendingAction = signal<{ type: 'approve' | 'deny' | 'block'; childName: string } | null>(
    null
  );
  newChild = signal<{ full_name: string; email: string; birthday: string }>({
    full_name: '',
    email: '',
    birthday: '',
  });

  auditTrail = signal([
    {
      id: 1,
      activity: "Athena provided feedback on Sophia's reading goals",
      time: 'Today, 9:32 AM',
    },
    {
      id: 2,
      activity: 'Parent adjusted Ethan\'s weekly focus to "Writing"',
      time: 'Yesterday, 7:14 PM',
    },
    { id: 3, activity: 'Sophia completed a math challenge session', time: '2 days ago, 5:30 PM' },
  ]);

  selectChild(id: number | null) {
    this.selectedChildId.set(id);
    this.closeActionMenu();
    this.cancelPendingAction();
  }

  onChildFieldChange(field: 'full_name' | 'email' | 'birthday', value: string) {
    this.newChild.update((child) => ({ ...child, [field]: value }));
  }

  selectedChild() {
    return this.children().find((c: Child) => c.id === this.selectedChildId()) ?? null;
  }

  ngOnInit() {
    const fallbackChildren = [
      {
        id: 1,
        name: 'Sophia',
        full_name: 'Sophia',
        status: 'active',
        gradeLevel: 'Grade 4',
        mood: 'Curious',
        avgProgress: 82,
        focus: ['Math', 'Reading Comprehension'],
        targets: [
          { id: 1, topic: 'Fractions & Decimals', progress: 90 },
          { id: 2, topic: 'Reading Inference Skills', progress: 75 },
        ],
      },
      {
        id: 2,
        name: 'Ethan',
        full_name: 'Ethan',
        status: 'active',
        gradeLevel: 'Grade 2',
        mood: 'Motivated',
        avgProgress: 68,
        focus: ['Writing', 'Social Studies'],
        targets: [
          { id: 3, topic: 'Creative Writing', progress: 70 },
          { id: 4, topic: 'US Geography', progress: 60 },
        ],
      },
    ];

    this.children.set(fallbackChildren as any);

    this.parentService.fetchChildren().then((kids) => {
      if (kids.length) {
        this.selectChild(kids[0].id);
      } else {
        this.children.set(fallbackChildren as any);
        this.selectChild(fallbackChildren[0].id);
      }
    });
  }

  openAddChildModal() {
    this.newChild.set({ full_name: '', email: '', birthday: '' });
    this.showAddChildModal.set(true);
  }

  closeAddChildModal() {
    this.showAddChildModal.set(false);
  }

  async saveChild() {
    const payload = { ...this.newChild() };
    const created = await this.parentService.addChild(payload);

    if (created) {
      this.selectChild(created.id);
    } else {
      const nextId =
        (this.children().reduce((max, c: any) => Math.max(max, c.id || 0), 0) || 0) + 1;
      this.children.set([
        ...this.children(),
        {
          id: nextId,
          name: payload.full_name || 'New Child',
          full_name: payload.full_name || 'New Child',
          email: payload.email,
          birthday: payload.birthday,
          gradeLevel: '',
          mood: '',
          avgProgress: 0,
          focus: [],
          targets: [],
        } as any,
      ]);
      this.selectChild(nextId);
    }

    this.closeAddChildModal();
  }

  async approveSelected() {
    const id = this.selectedChildId();
    if (id == null) return;
    const updated = await this.parentService.approveChild(id);
    if (updated) {
      this.selectChild(updated.id);
    }
  }

  async denySelected() {
    const id = this.selectedChildId();
    if (id == null) return;
    const updated = await this.parentService.denyChild(id);
    if (updated) {
      // If the child is filtered out (denied), select first available.
      const next = this.children()[0];
      this.selectChild(next ? next.id : null);
    }
  }

  async blockSelected() {
    const id = this.selectedChildId();
    if (id == null) return;
    const ok = await this.parentService.blockChild(id);
    if (ok) {
      const next = this.children()[0];
      this.selectChild(next ? next.id : null);
    }
  }

  toggleActionMenu() {
    this.actionMenuOpen.update((open) => !open);
  }

  closeActionMenu() {
    this.actionMenuOpen.set(false);
  }

  requestActionConfirmation(type: 'approve' | 'deny' | 'block') {
    const child = this.selectedChild();
    if (!child) return;
    this.pendingAction.set({ type, childName: child.full_name || child.name || 'this child' });
    this.closeActionMenu();
  }

  cancelPendingAction() {
    this.pendingAction.set(null);
  }

  async confirmPendingAction() {
    const pending = this.pendingAction();
    if (!pending) return;

    if (pending.type === 'approve') {
      await this.approveSelected();
    } else if (pending.type === 'deny') {
      await this.denySelected();
    } else if (pending.type === 'block') {
      await this.blockSelected();
    }

    this.pendingAction.set(null);
  }

  goToChildOptions() {
    const child = this.selectedChild();
    const uuid = (child as any)?.uuid || (child as any)?.child_uuid || (child as any)?.id;
    if (!uuid) return;
    this.router.navigate(['/profile', uuid, 'options']);
  }
}
