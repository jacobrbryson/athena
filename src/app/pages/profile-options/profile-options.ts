import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Child, ParentService } from 'src/app/services/parent';
import { ToastService } from 'src/app/services/toast';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';
import { ConfirmDialog } from 'src/app/shared/confirm-dialog/confirm-dialog';
import { MaskedEmail } from 'src/app/shared/masked-email/masked-email';

@Component({
  selector: 'app-profile-options',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, Breadcrumb, MaskedEmail, ConfirmDialog],
  templateUrl: './profile-options.html',
  styleUrl: './profile-options.css',
})
export class ProfileOptions implements OnInit {
  childUuid = '';
  private route = inject(ActivatedRoute);
  private parentService = inject(ParentService);
  private toastService = inject(ToastService);

  child = signal<Child | null>(null);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  deleting = signal<boolean>(false);
  editMode = signal<boolean>(false);
  showDeleteConfirm = signal<boolean>(false);
  form = signal({
    full_name: '',
    email: '',
    birthday: '',
    profile_editing_locked: false,
  });

  breadcrumbTrail = computed(() => [
    { text: 'Profile', muted: true },
    { text: this.childName() || 'Child', bold: true },
  ]);

  ngOnInit(): void {
    this.childUuid = this.route.snapshot.paramMap.get('uuid') ?? '';
    this.loadChild();
  }

  childName() {
    const c = this.child();
    return c?.full_name || c?.name || 'Child';
  }

  childEmail() {
    return this.child()?.email || 'Email not set';
  }

  childBirthday() {
    return this.child()?.birthday || '';
  }

  private findChild(children: Child[]): Child | null {
    return (
      children.find(
        (c: Child) =>
          c.uuid === this.childUuid ||
          (c as any).child_uuid === this.childUuid ||
          c.google_id === this.childUuid ||
          `${c.id}` === this.childUuid
      ) || null
    );
  }

  private prefillForm(child: Child) {
    const birthday =
      typeof child.birthday === 'string' && child.birthday.length >= 10
        ? child.birthday.slice(0, 10)
        : child.birthday || '';
    this.form.set({
      full_name: child.full_name || (child as any).name || '',
      email: child.email || '',
      birthday,
      profile_editing_locked: !!child.profile_editing_locked,
    });
  }

  async loadChild() {
    this.loading.set(true);
    try {
      const children = await this.parentService.fetchChildren();
      const match = this.findChild(children);
      if (!match) {
        this.toastService.show('Child not found for this account.', 'error');
        return;
      }
      this.child.set(match);
      this.prefillForm(match);
    } finally {
      this.loading.set(false);
    }
  }

  startEdit() {
    if (!this.child()) return;
    this.editMode.set(true);
  }

  cancelEdit() {
    const c = this.child();
    if (c) this.prefillForm(c);
    this.editMode.set(false);
  }

  updateField(field: 'full_name' | 'email' | 'birthday', value: string) {
    this.form.update((f) => ({ ...f, [field]: value }));
  }

  toggleProfileLock(checked: boolean) {
    this.form.update((f) => ({ ...f, profile_editing_locked: checked }));
  }

  async saveChanges() {
    if (!this.child()) return;
    this.saving.set(true);
    const identifier =
      this.childUuid ||
      this.child()?.uuid ||
      (this.child() as any).child_uuid ||
      (this.child() as any).id;
    try {
      const updated = await this.parentService.updateChild(identifier as any, {
        ...this.form(),
      });
      if (updated) {
        const merged = { ...(this.child() as any), ...updated } as Child;
        this.child.set(merged);
        this.prefillForm(merged);
        this.editMode.set(false);
        this.toastService.show('Child profile updated.', 'success');
      }
    } finally {
      this.saving.set(false);
    }
  }

  async deleteChild() {
    if (!this.child()) return;
    this.deleting.set(true);
    const identifier =
      this.childUuid ||
      this.child()?.uuid ||
      (this.child() as any).child_uuid ||
      (this.child() as any).id;
    try {
      const ok = await this.parentService.deleteChild(identifier as any);
      if (ok) {
        this.child.set(null);
        this.editMode.set(false);
        this.toastService.show('Child removed from your account.', 'success');
      }
    } finally {
      this.deleting.set(false);
      this.showDeleteConfirm.set(false);
    }
  }
}
