import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

export interface Crumb {
  text: string;
  bold?: boolean;
  muted?: boolean;
  link?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumb.html',
  styles: [],
})
export class Breadcrumb implements OnDestroy {
  @Input() label = 'Account Settings';
  @Input() labels: Array<string | Crumb> = [];
  @Input() dashboardTooltip = 'Complete your profile to unlock the dashboard';
  @Input() showDashboardCrumb = true;
  @Input() disableDashboard = true;

  isOnProfile = false;
  private sub: Subscription;

  constructor(private router: Router) {
    const profilePrefix = '/dashboard/profile';
    this.isOnProfile =
      this.router.url.startsWith(profilePrefix) || this.router.url.startsWith('/profile');
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
        this.isOnProfile = url.startsWith(profilePrefix) || url.startsWith('/profile');
      }
    });
  }

  private normalizeLabels(): Crumb[] {
    if (this.labels && this.labels.length) {
      return this.labels.map((item) =>
        typeof item === "string" ? { text: item, bold: false, muted: false } : item
      );
    }
    return [{ text: this.label, bold: false, muted: false }];
  }

  crumbs(): Crumb[] {
    const trail = this.normalizeLabels();
    if (this.showDashboardCrumb) {
      trail.unshift({
        text: "Dashboard",
        muted: true,
        link: this.disableDashboard ? undefined : "/dashboard",
      });
    }
    return trail;
  }

  crumbClass(crumb: Crumb): string {
    if (crumb.bold) return ["text-slate-900", "font-semibold"].join(" ");
    // Treat all non-bold crumbs the same weight/color for a consistent muted look.
    return ["text-slate-400", "font-normal"].join(" ");
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
