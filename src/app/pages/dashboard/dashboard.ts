import { NgIf } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Kids } from '../try-it/sections/kids/kids';
import { ProfileService } from 'src/app/services/profile';
import { Breadcrumb } from 'src/app/shared/breadcrumb/breadcrumb';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, Kids, Breadcrumb],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private profileService = inject(ProfileService);

  loading = signal<boolean>(true);
  viewMode = signal<'kid' | 'adult' | 'unknown'>('unknown');

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
}
