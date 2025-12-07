import { CommonModule, NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Kids } from 'src/app/pages/dashboard/sections/kids/kids';
import { ProfileService } from 'src/app/services/profile';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';
import { Parents } from 'src/app/pages/dashboard/sections/parents/parents';
import { Teachers } from 'src/app/pages/dashboard/sections/teachers/teachers';

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

	private static readonly ADULT_TAB_STORAGE_KEY = "athena_dashboard_adult_tab";

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

		// If the profile could not be loaded, avoid redirect loops and stay put.
		if (!profile) {
			this.loading.set(false);
			return;
		}

		if (!profile.birthday) {
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

		if (this.isTeacher() && this.isParent()) {
			const storedTab = this.getStoredAdultTab();
			if (storedTab) {
				this.activeAdultTab.set(storedTab);
			} else {
				// Default to teacher for adults if both roles are available
				this.activeAdultTab.set('teacher');
			}
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
		const profile = this.profileService.profile();
		const uuid = profile?.uuid || (profile as any)?.google_id;
		if (uuid) {
			this.router.navigate(['/dashboard/profile', uuid]);
			return;
		}
		this.router.navigate(['/profile']);
	}

	setAdultTab(role: 'teacher' | 'parent') {
		this.activeAdultTab.set(role);
		this.persistAdultTab(role);
	}

	private persistAdultTab(role: 'teacher' | 'parent') {
		if (typeof window === 'undefined') return;
		window.localStorage.setItem(
			Dashboard.ADULT_TAB_STORAGE_KEY,
			role
		);
	}

	private getStoredAdultTab(): 'teacher' | 'parent' | null {
		if (typeof window === 'undefined') return null;
		const value = window.localStorage.getItem(
			Dashboard.ADULT_TAB_STORAGE_KEY
		);
		return value === 'teacher' || value === 'parent' ? value : null;
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
