import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Profile as ProfileModel, ProfileService } from 'src/app/services/profile';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';
import { MaskedEmail } from 'src/app/shared/masked-email/masked-email';
import { formatDisplayTime } from 'src/app/shared/date-utils';

declare const grecaptcha: any;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule, Breadcrumb, MaskedEmail],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  profileService = inject(ProfileService);
  private router = inject(Router);

  profile = this.profileService.profile;
  loading = this.profileService.loading;
  saving = this.profileService.saving;
  blocklist = this.profileService.blocklist;
  blocklistLoading = this.profileService.blocklistLoading;
  blocklistAction = this.profileService.blocklistAction;
  guardians = this.profileService.guardians;
  guardiansLoading = this.profileService.guardiansLoading;
  profileLocked = computed<boolean>(() => !!this.profile()?.profile_editing_locked);

  editing = signal<boolean>(true);
  currentStep = signal<0 | 1 | 2>(1); // 0 = viewing existing profile, 1 = basics, 2 = post-save follow-up
  form = signal({
    full_name: '',
    email: '',
    birthday: '',
    has_guardian: false,
    is_guardian: false,
    is_teacher: false,
  });

  // Fallback computed for when data is pending.
  profileSummary = computed(() => {
    const current = this.profile();
    if (this.loading()) return 'Loading your profile...';
    if (!this.hasProfile()) return '⚠️ Profile setup is not complete.';
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
    this.profileService.fetchProfile().then((p) => {
      this.syncFromProfile();
    });
    this.profileService.fetchBlocklist();
  }

  ngOnInit(): void {
    this.prefillFromToken();
    // Always fetch latest profile, then hydrate the form/state.
    this.profileService
      .fetchProfile()
      .then(() => {
        this.syncFromProfile();
        this.profileService.fetchBlocklist();
        this.profileService.fetchGuardians();
      });
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

  async saveAndAdvance() {
    const data = this.form();
    const saved = await this.profileService.saveProfile({
      full_name: data.full_name || this.profile()?.full_name,
      email: data.email,
      birthday: data.birthday,
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

  private parseBlockedDate(value?: string | Date): Date | null {
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

  formatBlockedTimestamp(value?: string) {
    const date = this.parseBlockedDate(value);
    if (!date) return 'Unknown time';
    return formatDisplayTime(date);
  }

  formatBlockedRelative(value?: string) {
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
}
