import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Functional Guard to check if a user is authenticated.
 * If not authenticated, it redirects them to the login page.
 */
export const AuthGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // 1. Check for the custom JWT token in localStorage
  const token = localStorage.getItem('auth_token');

  if (token) {
    // 2. Token exists: Allow navigation
    // NOTE: For full security, you should also check token expiration here
    return true;
  } else {
    // 3. Token missing: Redirect to the login page
    console.warn('Access denied. Redirecting to login.');
    // Pass the attempted URL state so the login page could redirect back later
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
};
