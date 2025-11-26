import { HttpClient } from '@angular/common/http';
// 🔑 NEW: Import ActivatedRoute
import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { asset } from 'src/app/asset';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements AfterViewInit {
  asset = asset;
  private readonly googleClientId = environment.googleClientId;
  errorMessage: string | null = null;
  private returnUrl: string = '/dashboard';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    this.route.queryParams.subscribe((params) => {
      this.returnUrl = params['returnUrl'] || '/dashboard';
    });

    this.checkAuthStatus();
  }

  ngAfterViewInit(): void {
    this.initializeGoogleSignIn();
  }

  private checkAuthStatus(): void {
    const authToken = localStorage.getItem('auth_token');

    if (authToken) {
      console.log('Valid auth_token found. Redirecting to:', this.returnUrl);
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  private initializeGoogleSignIn(): void {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: this.googleClientId,
        callback: this.handleCredentialResponse.bind(this),
      });

      const container = document.getElementById('google-signin-button-container');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
        });
      }
    } else {
      console.error('Google Identity Services script not loaded.');
      this.errorMessage = 'Sign-in services are unavailable. Please check your connection.';
      this.cd.detectChanges();
    }
  }

  private handleCredentialResponse(response: any): void {
    this.errorMessage = null;

    if (response.credential) {
      const jwtToken = response.credential;
      this.sendTokenToBackend(jwtToken);
    } else {
      console.error('Google Sign-In failed: No credential received.');
      this.errorMessage = 'Google sign-in failed.';
    }

    this.cd.detectChanges();
  }

  private sendTokenToBackend(token: string): void {
    const apiEndpoint = `${environment.proxyServer}/api/v1/auth/google`;
    const body = { token: token };

    this.http
      .post<{ jwt: string }>(apiEndpoint, body)
      .pipe(
        catchError((error) => {
          console.error('Backend authentication failed:', error);
          this.errorMessage = 'Failed to get user account.';
          this.cd.detectChanges();
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response && response.jwt) {
          console.log('Backend authentication successful. Received custom JWT.');
          localStorage.setItem('auth_token', response.jwt);

          // 🔑 NEW: Use the stored returnUrl for redirection after successful login
          this.router.navigateByUrl(this.returnUrl);
        } else if (response !== null) {
          console.error('Backend response missing expected JWT field.');
          this.errorMessage = 'Server error during login. Missing authentication token.';
          this.cd.detectChanges();
        }
      });
  }
}
