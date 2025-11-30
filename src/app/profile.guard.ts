import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ProfileService } from './services/profile';

/**
 * Ensures a profile is loaded before allowing access to certain routes.
 * If no profile is available after attempting a fetch, redirect to /profile.
 */
export const ProfileGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const router = inject(Router);
  const profileService = inject(ProfileService);

  // If we already have a profile, allow navigation.
  if (profileService.profile()) {
    return true;
  }

  // Attempt to fetch the profile; the service guards against duplicate in-flight requests.
  await profileService.fetchProfile();

  // If the profile is still missing, redirect to settings page.
  if (!profileService.profile()) {
    return router.createUrlTree(['/profile']);
  }

  return true;
};
