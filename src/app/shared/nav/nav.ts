import { CommonModule } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, CommonModule],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
})
export class Nav {
  isLoggedIn = signal<boolean>(false);

  constructor(private router: Router) {
    this.checkLoginStatus();
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
  }

  /**
   * Clears the authentication token and redirects the user to the home page.
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    this.isLoggedIn.set(false);
    this.router.navigate(['/']);
    window.dispatchEvent(new StorageEvent('storage', { key: 'auth_token' }));
  }
}
