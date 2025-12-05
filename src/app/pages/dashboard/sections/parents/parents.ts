import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ParentService } from 'src/app/services/parent';
import { Child } from 'src/app/services/parent';
import { formatDisplayTime } from 'src/app/shared/date-utils';
import { Avatar } from 'src/app/shared/avatar/avatar';

@Component({
  selector: 'app-parents',
  imports: [CommonModule, RouterModule, Avatar],
  standalone: true,
  templateUrl: './parents.html',
  styleUrls: ['./parents.css'],
})
export class Parents implements OnInit {
  private parentService = inject(ParentService);
  private router = inject(Router);
  children = this.parentService.children;
  parentLoading = this.parentService.loading;
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
  moodSuggestionsOpen = signal(false);
  moodSuggestions = signal([
    {
      title: 'Celebrate consistency',
      body: 'Point out 3 moments this week when they stayed on task and reward with a short break.',
    },
    {
      title: 'Lighten the load',
      body: 'Swap a harder goal with a creative activity to rebuild confidence before retrying.',
    },
    {
      title: 'Check-in prompt',
      body: 'Ask “What felt easy today? What felt heavy?” and log it to track mood patterns.',
    },
  ]);

  auditTrail = signal<any[]>([]);

  selectChild(id: number | null) {
    this.selectedChildId.set(id);
    this.closeActionMenu();
    this.cancelPendingAction();
    if (id == null) {
      this.auditTrail.set([]);
      return;
    }
    this.loadChildDetails(id);
  }

  onChildFieldChange(field: 'full_name' | 'email' | 'birthday', value: string) {
    this.newChild.update((child) => ({ ...child, [field]: value }));
  }

  selectedChild() {
    return this.children().find((c: Child) => c.id === this.selectedChildId()) ?? null;
  }

  ngOnInit() {
    this.parentService.fetchChildren().then((kids) => {
      if (kids.length) {
        this.selectChild(kids[0].id);
      } else {
        this.selectChild(null);
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

  private childRouteUuid(child: Child | null) {
    return (child as any)?.uuid || (child as any)?.child_uuid || (child as any)?.id;
  }

  goToLearningGoals() {
    const uuid = this.childRouteUuid(this.selectedChild());
    if (!uuid) return;
    this.router.navigate(['/dashboard/profile', uuid, 'learning-goals']);
  }

  goToActivity() {
    const uuid = this.childRouteUuid(this.selectedChild());
    if (!uuid) return;
    this.router.navigate(['/dashboard/profile', uuid, 'activity']);
  }

  openMoodSuggestions() {
    this.moodSuggestionsOpen.set(true);
  }

  closeMoodSuggestions() {
    this.moodSuggestionsOpen.set(false);
  }

  private async loadChildDetails(id: number) {
    const child = this.selectedChild();
    const identifier = this.childRouteUuid(child) ?? id;

    const goals = await this.parentService.fetchChildGoals(identifier as any);
    if (goals) {
      this.children.update((list) =>
        list.map((c) => (c.id === id ? ({ ...c, targets: goals } as any) : c))
      );
    }

    const activity = await this.parentService.fetchChildActivity(identifier as any);
    if (Array.isArray(activity)) {
      this.auditTrail.set(activity);
    }
  }

  formatActivityTime = formatDisplayTime;
}
