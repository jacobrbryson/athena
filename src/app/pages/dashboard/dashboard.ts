import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Kids } from '../try-it/sections/kids/kids';
import { ProfileService } from 'src/app/services/profile';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';
import { Parents } from '../try-it/sections/parents/parents';
import { Teachers } from '../try-it/sections/teachers/teachers';

@Component({
	selector: 'app-dashboard',
	standalone: true,
	imports: [CommonModule, NgIf, Kids, Breadcrumb, Parents, Teachers],
	templateUrl: './dashboard.html',
	styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
	private router = inject(Router);
	private profileService = inject(ProfileService);

	loading = signal<boolean>(true);
	viewMode = signal<'kid' | 'adult' | 'unknown'>('unknown');
	isTeacher = signal<boolean>(false);
	isParent = signal<boolean>(false);
	activeAdultTab = signal<'teacher' | 'parent'>('parent');

	async ngOnInit() {
		await this.init();
	}

  private async init() {
    let profile = this.profileService.profile();

    if (!profile) {
      profile = await this.profileService.fetchProfile();
    }

		if (!profile || !profile.birthday) {
			this.redirectToProfile();
			return;
		}

    const age = this.computeAge(profile.birthday);

    // Missing valid age or required guardian flag for <13 -> redirect.
    if (age === null) {
      this.redirectToProfile();
      return;
    }

    if (age < 13 && !profile.has_guardian) {
      this.redirectToProfile();
      return;
    }

		if (age >= 18 && !(profile.is_guardian || profile.is_teacher)) {
			this.redirectToProfile();
			return;
		}

		this.isTeacher.set(Boolean(profile.is_teacher));
		this.isParent.set(Boolean(profile.is_guardian));

		if (age >= 18 && this.isTeacher()) {
			this.activeAdultTab.set('teacher');
		} else {
			if (this.isTeacher() && !this.isParent()) this.activeAdultTab.set('teacher');
			if (this.isParent() && !this.isTeacher()) this.activeAdultTab.set('parent');
		}

		this.viewMode.set(age < 18 ? 'kid' : 'adult');
		this.loading.set(false);
	}

  private computeAge(birthday: string): number | null {
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

	private redirectToProfile() {
		this.router.navigate(['/profile']);
	}

	breadcrumbLabel(): string {
		if (this.viewMode() === 'kid') {
			return 'Learning Companion';
		}

		if (this.viewMode() === 'adult') {
			if (this.isTeacher() && this.activeAdultTab() === 'teacher') {
				return 'Teacher';
			}
			if (this.isParent() && this.activeAdultTab() === 'parent') {
				return 'Parent';
			}
			if (this.isTeacher()) return 'Teacher';
			if (this.isParent()) return 'Parent';
		}

		return 'Dashboard';
	}
}
