import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { ProfileService } from 'src/app/services/profile';
import { Avatar } from '../avatar/avatar';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, CommonModule, Avatar],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  private router = inject(Router);
  private profileService = inject(ProfileService);

  isLoggedIn = signal<boolean>(false);
  menuOpen = signal<boolean>(false);
  profile = this.profileService.profile;

  constructor() {
    this.checkLoginStatus();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkLoginStatus();
      }
    });
  }

  /**
   * 🔑 HostListener detects changes to localStorage from other tabs/windows
   * This keeps the isLoggedIn state synchronized across the application.
   */
  @HostListener('window:storage', ['$event'])
  onStorageChange(event: StorageEvent) {
    if (event.key === 'auth_token' || event.key === null) {
      this.checkLoginStatus();
    }
  }

  /**
   * Checks for the presence of the auth_token in localStorage.
   */
  checkLoginStatus(): void {
    const tokenPresent = !!localStorage.getItem('auth_token');
    this.isLoggedIn.set(tokenPresent);
    if (tokenPresent) {
      // Ensure profile is hydrated so the nav avatar can show the user's picture/initial.
      this.profileService.fetchProfile();
    } else {
      this.profile.set(null);
    }
  }

  /**
   * Clears the authentication token and redirects the user to the home page.
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    this.isLoggedIn.set(false);
    this.profile.set(null);
    this.router.navigate(['/']);
    window.dispatchEvent(new StorageEvent('storage', { key: 'auth_token' }));
    this.menuOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
