import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface Profile {
  uuid?: string;
  email?: string;
  full_name?: string;
  birthday?: string;
  has_guardian?: boolean;
  is_guardian?: boolean;
  is_teacher?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  profile = signal<Profile | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);

  private hasExistingProfile(): boolean {
    const p = this.profile();
    if (!p) return false;
    return Boolean(p.uuid || p.email || p.full_name || p.birthday);
  }

  constructor() {
    // Fetch the profile as soon as the service is instantiated.
    this.fetchProfile();
  }

  async fetchProfile(): Promise<Profile | null> {
    if (this.loading()) return this.profile();

    this.loading.set(true);

    try {
      const profile = await firstValueFrom(
        this.http.get<Profile>(`${environment.proxyServer}/api/v1/profile`)
      );
      const merged = { ...(this.profile() || {}), ...profile };
      this.profile.set(merged);
      return merged;
    } catch (err: any) {
      console.error('ProfileService: Failed to fetch profile', err);
      this.profile.set(null);
      this.toastService.show('Unable to load your profile right now.', 'error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async createProfile(payload: Partial<Profile>): Promise<Profile | null> {
    if (this.saving()) return this.profile();

    this.saving.set(true);
    try {
      const profile = await firstValueFrom(
        this.http.post<Profile>(`${environment.proxyServer}/api/v1/profile`, payload)
      );
      const merged = { ...payload, ...profile };
      this.profile.set(merged);
      return merged;
    } catch (err: any) {
      console.error('ProfileService: Failed to create/update profile', err);
      this.toastService.show('Unable to save your profile right now.', 'error');
      return null;
    } finally {
      this.saving.set(false);
    }
  }

  async saveProfile(payload: Partial<Profile>): Promise<Profile | null> {
    if (this.saving()) return this.profile();

    this.saving.set(true);
    try {
      const endpoint = `${environment.proxyServer}/api/v1/profile`;
      const request$ = this.hasExistingProfile()
        ? this.http.put<Profile>(endpoint, payload)
        : this.http.post<Profile>(endpoint, payload);

      const profile = await firstValueFrom(request$);
      const merged = { ...payload, ...profile };
      this.profile.set(merged);
      return merged;
    } catch (err: any) {
      console.error('ProfileService: Failed to save profile', err);
      this.toastService.show('Unable to save your profile right now.', 'error');
      return null;
    } finally {
      this.saving.set(false);
    }
  }
}
