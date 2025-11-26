// src/app/auth.interceptor.ts

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authToken = localStorage.getItem('auth_token');

  // Skip intercepting the /auth/google endpoint since it doesn't need the custom JWT
  if (req.url.includes('/api/v1/auth/google')) {
    return next(req);
  }

  // 1. If a token exists, clone the request and add the Authorization header
  if (authToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  }

  // 2. Pass the cloned request to the next handler
  return next(req).pipe(
    // 3. Catch errors to handle 401 Unauthorized responses globally
    tap({
      error: (err) => {
        if (err instanceof HttpErrorResponse) {
          // If we receive a 401, it means the token is invalid or expired
          if (err.status === 401) {
            console.error('AuthInterceptor: 401 Unauthorized - Token invalid or expired.');

            // Clear the invalid token
            localStorage.removeItem('auth_token');

            // Redirect user to login page
            router.navigate(['/login']);
          }
        }
      },
    })
  );
};
