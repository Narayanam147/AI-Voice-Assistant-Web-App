import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  userName = 'User';
  userPlan = 'Free Tier';
  isPremium = false;
  isCompact = false;

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private settingsService: SettingsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.session$.subscribe((session) => {
      if (session?.user) {
        this.fetchPlan();
      }
    });

    this.settingsService.settings$.subscribe(settings => {
      this.isCompact = settings.compactSidebar;
      if (settings.displayName) {
        this.userName = settings.displayName;
      } else {
        const session = this.authService.getAccessToken(); // fallback
        if (session) this.userName = 'User';
      }
    });

    // Re-fetch plan status on every navigation (catches post-payment redirect)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.authService.getAccessToken()) {
        this.fetchPlan();
      }
    });
  }

  private fetchPlan() {
    this.paymentService.getSubscriptionStatus().subscribe({
      next: (status) => {
        this.isPremium = status.role === 'premium' || status.role === 'admin';
        this.userPlan = this.isPremium ? 'Pro Plan' : 'Free Tier';
      },
      error: () => {
        this.userPlan = 'Free Tier';
        this.isPremium = false;
      }
    });
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => this.router.navigate(['/auth/login'])
    });
  }
}
