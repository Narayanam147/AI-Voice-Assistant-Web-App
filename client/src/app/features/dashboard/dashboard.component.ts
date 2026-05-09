import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ChatService } from '../../core/services/chat.service';

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

  constructor(
    private authService: AuthService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.authService.session$.subscribe(session => {
      if (session?.user) {
        this.userName = session.user.email?.split('@')[0] ?? 'User';
      }
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
          time: this.formatTimeAgo(new Date(s.last_message_at)),
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
