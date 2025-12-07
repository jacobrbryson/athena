import { NgFor, NgIf, CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Profile as ProfileModel, ProfileService } from 'src/app/services/profile';
import {
  ParentService,
  Child,
  GuardianSummary,
  SiblingSummary,
} from 'src/app/services/parent';
import { ToastService } from 'src/app/services/toast';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';
import { MaskedEmail } from 'src/app/shared/masked-email/masked-email';
import { AnimatedProgressBarComponent } from 'src/app/shared/animated-progress-bar/animated-progress-bar';
import { Avatar } from 'src/app/shared/avatar/avatar';
import { Subscription } from 'rxjs';
import { formatDisplayTime } from 'src/app/shared/date-utils';
import { GRADE_OPTIONS, formatGrade, GradeValue } from 'src/app/shared/constants/grades';
import { ConfirmDialog } from 'src/app/shared/confirm-dialog/confirm-dialog';

declare const grecaptcha: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    FormsModule,
    Breadcrumb,
    MaskedEmail,
    ConfirmDialog,
    AnimatedProgressBarComponent,
    Avatar,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  profileService = inject(ProfileService);
  private parentService = inject(ParentService);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private targetUuid = '';
  private routeSub: Subscription | null = null;

  profile = this.profileService.profile;
  loading = this.profileService.loading;
  saving = this.profileService.saving;
  blocklist = this.profileService.blocklist;
  blocklistLoading = this.profileService.blocklistLoading;
  blocklistAction = this.profileService.blocklistAction;
  guardians = this.profileService.guardians;
  guardiansLoading = this.profileService.guardiansLoading;
  childrenForGuardian = this.parentService.children;
  childrenForGuardianLoading = this.parentService.loading;
  profileLocked = computed<boolean>(() => !!this.profile()?.profile_editing_locked);
  viewMode = signal<'self' | 'child'>('self');

  editing = signal<boolean>(true);
  currentStep = signal<0 | 1 | 2>(1); // 0 = viewing existing profile, 1 = basics, 2 = post-save follow-up
  form = signal({
    full_name: '',
    email: '',
    birthday: '',
    grade: '' as GradeValue | '',
    has_guardian: false,
    is_guardian: false,
    is_teacher: false,
    profile_editing_locked: false,
  });
  gradeOptions = GRADE_OPTIONS;
  child = signal<Child | null>(null);
  childLoading = signal<boolean>(true);
  childSaving = signal<boolean>(false);
  childDeleting = signal<boolean>(false);
  childEditMode = signal<boolean>(false);
  showDeleteConfirm = signal<boolean>(false);
  childForm = signal({
    full_name: '',
    email: '',
    birthday: '',
    grade: '' as GradeValue | '',
    profile_editing_locked: false,
  });
  childGuardians = signal<GuardianSummary[]>([]);
  childGuardiansLoading = signal<boolean>(false);
  childSiblings = signal<SiblingSummary[]>([]);
  childSiblingsLoading = signal<boolean>(false);
  childBreadcrumbTrail = computed(() => [
    { text: 'Profile', muted: true },
    { text: this.childName() || 'Child', bold: true },
  ]);

  // Fallback computed for when data is pending.
  profileSummary = computed(() => {
    const current = this.profile();
    if (this.loading()) return 'Loading your profile...';
    if (!this.hasProfile()) return 'Profile setup is not complete.';
    return current?.full_name || current?.email || 'Profile loaded';
  });

  hasProfile = computed(() => {
    const p = this.profile();
    if (!p) return false;
    // Treat an empty object as no profile; require at least one meaningful field.
    return Boolean(p.uuid || p.email || p.full_name || p.birthday);
  });

  profileComplete = computed(() => this.isProfileComplete(this.profile()));

  age = computed<number | null>(() => {
    const dob = this.profile()?.birthday || this.form().birthday;
    const computedAge = dob ? this.ageFromBirthday(dob) : null;
    return computedAge;
  });

  ageBucket = computed<'under13' | 'teen' | 'adult' | 'unknown'>(() => {
    const age = this.age();
    if (age === null) return 'unknown';
    if (age < 13) return 'under13';
    if (age <= 18) return 'teen';
    return 'adult';
  });

  subjects = ['Math', 'Science', 'History', 'Art', 'Music', 'Language Arts', 'Coding'];
  subjectSelections = signal<Record<string, boolean>>({});
  dislikeSubjects = ['Math', 'Science', 'History', 'Art', 'Music', 'Language Arts', 'Coding'];
  dislikeSelections = signal<Record<string, boolean>>({});
  // Roles (parent/teacher) are tracked on the form to sync with the profile model.
  parentEmail = signal<string>('');
  parentEmailError = signal<string | null>(null);
  sendingInvite = signal<boolean>(false);
  inviteMessage = signal<string>('');
  private recaptchaLoader: Promise<void> | null = null;
  private static readonly RECAPTCHA_SITE_KEY = '6Lc2OiAsAAAAAHZXE64gzTrmdKvvxVMjqdxUa8O5';

  refresh() {
    if (this.viewMode() === 'child') {
      this.loadChildProfile();
      return;
    }
    this.profileService.fetchProfile().then(() => {
      this.syncFromProfile();
    });
    this.profileService.fetchBlocklist();
  }

  ngOnInit(): void {
    this.prefillFromToken();
    this.routeSub = this.route.paramMap.subscribe((params) => {
      this.targetUuid = params.get('uuid') ?? '';
      this.initializeView();
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  private async initializeView() {
    this.child.set(null);
    this.childGuardians.set([]);
    this.childSiblings.set([]);
    this.childLoading.set(true);

    await this.profileService.fetchProfile();
    this.prefillFromProfile();

    const myUuid = this.profile()?.uuid || (this.profile() as any)?.google_id || '';
    const isSelfRoute = !this.targetUuid || (myUuid && this.targetUuid === myUuid);

    if (isSelfRoute) {
      this.viewMode.set('self');
      if (myUuid && this.targetUuid !== myUuid) {
        this.router.navigate(['/dashboard/profile', myUuid], { replaceUrl: true });
        return;
      }
      this.syncFromProfile();
      this.profileService.fetchBlocklist();
      this.profileService.fetchGuardians();
      this.parentService.fetchChildren();
      return;
    }

    this.viewMode.set('child');
    await this.loadChildProfile();
  }

  nextStep() {
    if (!this.form().birthday || this.saving()) return;
    this.saveAndAdvance();
  }

  goToStep(step: 1 | 2) {
    if (step === 1) {
      this.currentStep.set(1);
      return;
    }

    // Step 2 requires a birthday. If not saved yet, attempt to save first.
    if (!this.form().birthday || this.saving()) return;

    if (this.hasProfile()) {
      this.currentStep.set(2);
      return;
    }

    // Save and then advance.
    this.saveAndAdvance();
  }

  updateBirthday(value: string) {
    this.form.update((f) => ({ ...f, birthday: value }));
  }

  updateGrade(value: GradeValue | '') {
    this.form.update((f) => ({ ...f, grade: value || '' }));
  }

  async saveAndAdvance() {
    const data = this.form();
    const saved = await this.profileService.saveProfile({
      full_name: data.full_name || this.profile()?.full_name,
      email: data.email,
      birthday: data.birthday,
      grade: data.grade,
      has_guardian: data.has_guardian,
      is_guardian: data.is_guardian,
      is_teacher: data.is_teacher,
    });

    if (saved) {
      await this.profileService.fetchProfile();
      this.prefillFromProfile();
      const profileData = this.profile();
      const age = profileData?.birthday ? this.ageFromBirthday(profileData.birthday) : null;

      if (age !== null) {
        if (age < 13) {
          if (!profileData?.has_guardian) {
            this.currentStep.set(2);
            this.editing.set(true);
            return;
          }
          this.editing.set(false);
          this.currentStep.set(0);
          return;
        }
        if (age < 18) {
          this.editing.set(false);
          this.currentStep.set(0);
          this.router.navigate(['/dashboard']);
          return;
        }
        // age >= 18 -> force step 2 to set roles
        this.currentStep.set(2);
        this.editing.set(true);
        return;
      }

      // Adult flow: if roles are set, exit edit mode; otherwise stay on step 2.
      if (this.profileComplete()) {
        this.editing.set(false);
        this.currentStep.set(0);
      } else {
        this.currentStep.set(2);
        this.editing.set(true);
      }
    }
  }

  toggleSubject(subject: string) {
    this.subjectSelections.update((sel) => ({
      ...sel,
      [subject]: !sel[subject],
    }));
  }

  toggleDislike(subject: string) {
    this.dislikeSelections.update((sel) => ({
      ...sel,
      [subject]: !sel[subject],
    }));
  }

  toggleRole(role: 'parent' | 'teacher') {
    this.form.update((f) => ({
      ...f,
      [role === 'parent' ? 'is_guardian' : 'is_teacher']: !(
        role === 'parent' ? f.is_guardian : f.is_teacher
      ),
    }));
  }

  onParentEmailChange(value: string) {
    this.parentEmail.set(value);
    this.parentEmailError.set(this.validateParentEmail(value) ? null : 'Enter a valid email.');
  }

  private validateParentEmail(value: string): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }

  private async loadRecaptcha(): Promise<void> {
    if (typeof window === 'undefined') return;
    if ((window as any).grecaptcha?.enterprise || (window as any).grecaptcha) return;
    if (this.recaptchaLoader) return this.recaptchaLoader;

    this.recaptchaLoader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${Profile.RECAPTCHA_SITE_KEY}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.recaptchaLoader = null;
        reject(new Error('Failed to load reCAPTCHA'));
      };
      document.head.appendChild(script);
    });

    return this.recaptchaLoader;
  }

  private async getExecuteFunction(): Promise<{
    execute: (siteKey: string, opts: any) => Promise<string>;
    ready: (cb: () => void) => void;
  }> {
    const start = Date.now();
    const timeoutMs = 5000;
    while (Date.now() - start < timeoutMs) {
      const captcha: any = (typeof window !== 'undefined' && (window as any).grecaptcha) || grecaptcha;
      if (captcha) {
        const readyFn =
          (captcha.enterprise?.ready && captcha.enterprise.ready.bind(captcha.enterprise)) ||
          (captcha.ready && captcha.ready.bind(captcha));
        const execute =
          (captcha.enterprise?.execute && captcha.enterprise.execute.bind(captcha.enterprise)) ||
          (captcha.execute && captcha.execute.bind(captcha));
        if (readyFn && execute) {
          return { execute, ready: readyFn };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('reCAPTCHA execute is not available');
  }

  private async executeRecaptcha(action: string): Promise<string> {
    await this.loadRecaptcha();
    const { execute, ready } = await this.getExecuteFunction();
    await new Promise<void>((resolve) => ready(resolve));
    return execute(Profile.RECAPTCHA_SITE_KEY, { action });
  }

  async sendParentInvite() {
    const email = this.parentEmail().trim().toLowerCase();
    if (!this.validateParentEmail(email)) {
      this.parentEmailError.set('Enter a valid email.');
      return;
    }

    if (this.sendingInvite()) return;
    this.sendingInvite.set(true);
    this.inviteMessage.set('');

    try {
      const token = await this.executeRecaptcha('invite_parent');
      const ok = await this.profileService.sendParentInvite(email, token);
      if (ok) {
        this.inviteMessage.set('Invite sent! Ask your parent/guardian to check their email.');
      }
    } catch (err: any) {
      console.error('Failed to send parent invite', err);
      this.parentEmailError.set(err?.message || 'Unable to send invite right now.');
    } finally {
      this.sendingInvite.set(false);
    }
  }

  async goToDashboard() {
    const data = this.form();
    // Persist role choices before navigating.
    await this.profileService.saveProfile({
      full_name: data.full_name || this.profile()?.full_name,
      email: data.email,
      birthday: data.birthday,
      grade: data.grade,
      has_guardian: data.has_guardian,
      is_guardian: data.is_guardian,
      is_teacher: data.is_teacher,
    });
    this.router.navigate(['/dashboard']);
  }

  canContinueAdult() {
    const current = this.form();
    return current.is_guardian || current.is_teacher;
  }

  startEdit() {
    if (this.profileLocked()) return;
    this.editing.set(true);
    this.currentStep.set(1);
  }

  async unblockChild(childProfileId: number, addChild: boolean, childName?: string) {
    await this.profileService.unblockChild(childProfileId, addChild, childName);
    // Refresh profile state in case a child relationship was added.
    if (addChild) {
      await this.profileService.fetchProfile();
    }
  }

  private syncFromProfile() {
    const p = this.profile();
    if (!p || !this.hasProfile()) return;

    const age = p.birthday ? this.ageFromBirthday(p.birthday) : null;
    const missingBirthday = !p.birthday;
    const under13NeedsGuardian = age !== null && age < 13 && !p.has_guardian;
    const adultNeedsRole = age !== null && age >= 18 && !(p.is_guardian || p.is_teacher);

    this.prefillFromProfile();

    if (this.profileLocked()) {
      this.editing.set(false);
      this.currentStep.set(0);
      return;
    }

    if (missingBirthday || under13NeedsGuardian || adultNeedsRole) {
      this.editing.set(true);
      this.currentStep.set(2);
      return;
    }

    this.editing.set(false);
    this.currentStep.set(0);
  }

  private async loadChildProfile() {
    this.childLoading.set(true);
    try {
      const children = await this.parentService.fetchChildren();
      const match = this.findChild(children);
      if (!match) {
        this.child.set(null);
        this.childGuardians.set([]);
        this.childSiblings.set([]);
        this.toastService.show('Child not found for this account.', 'error');
        return;
      }
      this.child.set(match);
      this.prefillChildForm(match);
      const identifier = this.childIdentifier(match);
      if (identifier !== undefined && identifier !== null) {
        await Promise.all([
          this.loadChildGuardians(identifier),
          this.loadChildSiblings(identifier),
        ]);
      } else {
        this.childGuardians.set([]);
        this.childSiblings.set([]);
      }
    } finally {
      this.childLoading.set(false);
    }
  }

  private findChild(children: Child[]): Child | null {
    return (
      children.find(
        (c: Child) =>
          c.uuid === this.targetUuid ||
          (c as any).child_uuid === this.targetUuid ||
          c.google_id === this.targetUuid ||
          `${c.id}` === this.targetUuid
      ) || null
    );
  }

  private childIdentifier(childOverride?: Child | null): string | number | undefined {
    const c = childOverride || this.child();
    if (!c) return undefined;
    return (
      this.targetUuid ||
      c.uuid ||
      (c as any).child_uuid ||
      (c as any).google_id ||
      c.id
    );
  }

  private async loadChildGuardians(childId: number | string) {
    this.childGuardiansLoading.set(true);
    try {
      const guardians = await this.parentService.fetchChildGuardians(childId);
      this.childGuardians.set(guardians);
    } finally {
      this.childGuardiansLoading.set(false);
    }
  }

  private async loadChildSiblings(childId: number | string) {
    this.childSiblingsLoading.set(true);
    try {
      const siblings = await this.parentService.fetchChildSiblings(childId);
      this.childSiblings.set(siblings);
    } finally {
      this.childSiblingsLoading.set(false);
    }
  }

  startChildEdit() {
    if (!this.child()) return;
    this.childEditMode.set(true);
  }

  cancelChildEdit() {
    const c = this.child();
    if (c) this.prefillChildForm(c);
    this.childEditMode.set(false);
  }

  updateChildField(field: 'full_name' | 'email' | 'birthday', value: string) {
    this.childForm.update((f) => ({ ...f, [field]: value }));
  }

  updateChildGrade(value: GradeValue | '') {
    this.childForm.update((f) => ({ ...f, grade: value || '' }));
  }

  toggleChildProfileLock(checked: boolean) {
    this.childForm.update((f) => ({ ...f, profile_editing_locked: checked }));
  }

  async saveChildChanges() {
    const child = this.child();
    if (!child) return;
    this.childSaving.set(true);
    const identifier = this.childIdentifier(child);
    if (!identifier) {
      this.childSaving.set(false);
      return;
    }
    try {
      const updated = await this.parentService.updateChild(identifier as any, {
        ...this.childForm(),
      });
      if (updated) {
        const merged = { ...(child as any), ...updated } as Child;
        this.child.set(merged);
        this.prefillChildForm(merged);
        this.childEditMode.set(false);
        this.toastService.show('Child profile updated.', 'success');
      }
    } finally {
      this.childSaving.set(false);
    }
  }

  async deleteChild() {
    const child = this.child();
    if (!child) return;
    this.childDeleting.set(true);
    const identifier = this.childIdentifier(child);
    if (!identifier) {
      this.childDeleting.set(false);
      return;
    }
    try {
      const ok = await this.parentService.deleteChild(identifier as any);
      if (ok) {
        this.child.set(null);
        this.childEditMode.set(false);
        this.toastService.show('Child removed from your account.', 'success');
      }
    } finally {
      this.childDeleting.set(false);
      this.showDeleteConfirm.set(false);
    }
  }

  childName() {
    const c = this.child();
    return c?.full_name || (c as any)?.name || 'Child';
  }

  childEmail() {
    return this.child()?.email || 'Email not set';
  }

  childBirthday() {
    return this.child()?.birthday || '';
  }

  childGradeLabel(): string {
    return formatGrade(
      this.childForm().grade ||
        (this.child() as any)?.grade ||
        ''
    );
  }

  private prefillFromToken() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const fullName =
        payload.full_name ||
        payload.name ||
        [payload.given_name, payload.family_name].filter(Boolean).join(' ') ||
        '';
      const email = payload.email || '';

      this.form.update((f) => ({
        ...f,
        full_name: f.full_name || fullName,
        email: f.email || email,
      }));
    } catch (err) {
      console.warn('Profile: unable to prefill from token', err);
    }
  }

  private prefillFromProfile() {
    const p = this.profile();
    if (!p) return;

    this.form.update((f) => ({
      ...f,
      full_name: p.full_name || (p as any).name || f.full_name,
      email: p.email || f.email,
      birthday: p.birthday || f.birthday,
      grade: (p as any).grade || f.grade,
      has_guardian: p.has_guardian ?? f.has_guardian,
      is_guardian: p.is_guardian ?? f.is_guardian,
      is_teacher: p.is_teacher ?? f.is_teacher,
    }));
  }

  private isProfileComplete(profile: ProfileModel | null): boolean {
    if (!profile || !profile.birthday || !profile.email || !profile.full_name) return false;
    const age = this.ageFromBirthday(profile.birthday);
    if (age === null) return false;
    if (age < 13) return !!profile.has_guardian;
    if (age >= 18) return !!(profile.is_guardian || profile.is_teacher);
    return true;
  }

  isDashboardDisabled(): boolean {
    const p = this.profile();
    if (!p || !p.birthday) return true;

    const age = this.ageFromBirthday(p.birthday);
    if (age === null) return true;

    if (age < 13 && !p.has_guardian) return true;
    if (age >= 18 && !(p.is_guardian || p.is_teacher)) return true;

    return false;
  }

  private ageFromBirthday(birthday: string): number | null {
    const birthDate = new Date(birthday);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private parseBlockedDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) {
      const d = value;
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const trimmed = value.trim();
    if (!trimmed) return null;

    // If the server returns "YYYY-MM-DD HH:mm:ss" without a timezone, treat it as UTC.
    const looksLikeSql = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed);
    const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);

    const candidate = looksLikeSql && !hasTz ? new Date(trimmed.replace(' ', 'T') + 'Z') : new Date(trimmed);
    if (Number.isNaN(candidate.getTime())) return null;
    return candidate;
  }

  formatBlockedTimestamp(value?: string | null) {
    const date = this.parseBlockedDate(value);
    if (!date) return 'Unknown time';
    return formatDisplayTime(date);
  }

  formatBlockedRelative(value?: string | null) {
    const date = this.parseBlockedDate(value);
    if (!date) return 'recently';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (diffDays === 1) return `yesterday at ${formatter.format(date)}`;
    if (diffDays < 7) return `${diffDays} days ago`;

    const dateFormatter = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    });
    return dateFormatter.format(date);
  }

  gradeLabel(): string {
    return formatGrade(this.form().grade || this.profile()?.grade || '');
  }

  private prefillChildForm(child: Child) {
    const birthday =
      typeof child.birthday === 'string' && child.birthday.length >= 10
        ? child.birthday.slice(0, 10)
        : child.birthday || '';
    this.childForm.set({
      full_name: child.full_name || (child as any).name || '',
      email: child.email || '',
      birthday,
      grade: ((child as any).grade as GradeValue) || '',
      profile_editing_locked: !!child.profile_editing_locked,
    });
  }

  guardianCreatedText(guardian: GuardianSummary): string {
    const fallbackDate = guardian.approved_at || guardian.invited_at || guardian.created_at;
    return this.formatBlockedRelative(fallbackDate);
  }

  childListName(child: Child): string {
    return child.full_name || (child as any).name || 'Child';
  }

  childGradeDisplay(child: Child): string {
    return formatGrade((child as any).grade || child.grade || '');
  }

  childStatusDisplay(child: Child): string {
    if (child.status === 'pending') return 'Pending approval';
    if (child.status === 'approved') return 'Approved';
    return 'Active';
  }

  siblingProgressValue(sibling: SiblingSummary): number {
    const raw = sibling.level_progress;
    if (!Number.isFinite(raw as any)) return 0;
    return Math.min(100, Math.max(0, Number(raw)));
  }

  siblingLevelLabel(sibling: SiblingSummary): string {
    if (Number.isFinite(sibling.level as any)) {
      return `Level ${Number(sibling.level)}`;
    }
    return 'Level not set';
  }

  siblingLevelShortLabel(sibling: SiblingSummary): string {
    if (Number.isFinite(sibling.level as any)) {
      return `Lvl ${Number(sibling.level)}`;
    }
    return 'Lvl -';
  }

  siblingGradeLabel(sibling: SiblingSummary): string {
    return formatGrade(sibling.grade || '');
  }
}
