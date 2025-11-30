import { NgIf } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Profile as ProfileModel, ProfileService } from 'src/app/services/profile';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIf, FormsModule, Breadcrumb],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private profileService = inject(ProfileService);
  private router = inject(Router);

  profile = this.profileService.profile;
  loading = this.profileService.loading;
  saving = this.profileService.saving;

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

  refresh() {
    this.profileService.fetchProfile().then((p) => {
      this.syncFromProfile();
    });
  }

  ngOnInit(): void {
    this.prefillFromToken();
    // Always fetch latest profile, then hydrate the form/state.
    this.profileService.fetchProfile().then(() => this.syncFromProfile());
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
    this.editing.set(true);
    this.currentStep.set(1);
  }

  private syncFromProfile() {
    const p = this.profile();
    if (!p || !this.hasProfile()) return;

    const age = p.birthday ? this.ageFromBirthday(p.birthday) : null;
    const missingBirthday = !p.birthday;
    const under13NeedsGuardian = age !== null && age < 13 && !p.has_guardian;
    const adultNeedsRole = age !== null && age >= 18 && !(p.is_guardian || p.is_teacher);

    this.prefillFromProfile();

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
}
