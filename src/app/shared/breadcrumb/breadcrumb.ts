import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
})
export class Breadcrumb implements OnDestroy {
  @Input() label = 'Account Settings';
  @Input() dashboardTooltip = 'Complete your profile to unlock the dashboard';
  @Input() showDashboardCrumb = true;
  @Input() disableDashboard = true;

  isOnProfile = false;
  private sub: Subscription;

  constructor(private router: Router) {
    this.isOnProfile = this.router.url.startsWith('/profile');
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.isOnProfile = event.urlAfterRedirects.startsWith('/profile');
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
