import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ToastService } from './toast';

export interface Profile {
  uuid?: string;
  google_id?: string;
  email?: string;
  full_name?: string;
  picture?: string;
  birthday?: string;
  has_guardian?: boolean;
  is_guardian?: boolean;
  is_teacher?: boolean;
}

export function normalizeProfileData(data: Profile | null): Profile | null {
  if (!data) return null;
  let birthday = data.birthday;

  if (typeof birthday === 'string') {
    const parsed = new Date(birthday);
    if (!Number.isNaN(parsed.getTime())) {
      birthday = parsed.toISOString().slice(0, 10);
    } else if (birthday.length >= 10) {
      birthday = birthday.slice(0, 10);
    }
  }

  return { ...data, birthday };
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
  private fetchPromise: Promise<Profile | null> | null = null;

  private normalizeProfile(data: Profile | null): Profile | null {
    return normalizeProfileData(data);
  }

  private hasExistingProfile(): boolean {
    const p = this.profile();
    if (!p) return false;
    return Boolean(p.uuid || p.email || p.full_name || p.birthday);
  }

  constructor() {}

  async fetchProfile(): Promise<Profile | null> {
    if (this.fetchPromise) return this.fetchPromise;
    if (this.loading()) return this.profile();

    this.loading.set(true);
    this.fetchPromise = (async () => {
      try {
        const profile = await firstValueFrom(
          this.http.get<Profile>(`${environment.proxyServer}/api/v1/profile`)
        );
        const normalized = this.normalizeProfile(profile);
        const merged = { ...(this.profile() || {}), ...(normalized || {}) };
        this.profile.set(merged);
        return merged;
      } catch (err: any) {
        console.error('ProfileService: Failed to fetch profile', err);
        this.profile.set(null);
        this.toastService.show('Unable to load your profile right now.', 'error');
        return null;
      } finally {
        this.loading.set(false);
        this.fetchPromise = null;
      }
    })();

    return this.fetchPromise;
  }

  async createProfile(payload: Partial<Profile>): Promise<Profile | null> {
    if (this.saving()) return this.profile();

    this.saving.set(true);
    try {
      const profile = await firstValueFrom(
        this.http.post<Profile>(`${environment.proxyServer}/api/v1/profile`, payload)
      );
      const normalized = this.normalizeProfile(profile);
      const merged = { ...payload, ...(normalized || {}) };
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
      const normalized = this.normalizeProfile(profile);
      const merged = { ...payload, ...(normalized || {}) };
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
