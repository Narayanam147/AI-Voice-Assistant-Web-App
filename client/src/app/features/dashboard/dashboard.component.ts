import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { SettingsService } from '../../core/services/settings.service';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  userName = 'User';
  recentSessions: any[] = [];
  totalSessions = 0;
  isLoading = true;
  isPremium = false;

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private settingsService: SettingsService,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    // 1. Listen for custom display name
    this.settingsService.settings$.subscribe(settings => {
      if (settings.displayName) {
        this.userName = settings.displayName;
      } else {
        // fallback
        const session = this.authService.getAccessToken();
        if (session) {
          this.authService.session$.subscribe(s => {
            if (s?.user) {
              this.userName = s.user.email?.split('@')[0] ?? 'User';
            }
          });
        }
      }
    });

    // 2. Fetch real subscription status
    this.paymentService.getSubscriptionStatus().subscribe({
      next: (status) => {
        this.isPremium = status.role === 'premium' || status.role === 'admin';
      },
      error: () => this.isPremium = false
    });

    this.loadRecentSessions();
  }

  loadRecentSessions() {
    this.isLoading = true;
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.recentSessions = data.slice(0, 4).map(s => ({
          id: s.id,
          title: s.title,
          time: s.last_message_at ? this.formatTimeAgo(new Date(s.last_message_at)) : 'No messages',
          iconClass: 'bg-indigo'
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  }
}
