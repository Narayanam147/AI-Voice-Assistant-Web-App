import { Component, inject, HostListener, ElementRef } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { CommonModule } from '@angular/common';
import { SettingsService } from '../../../core/services/settings.service';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { FooterComponent } from '../../components/footer/footer.component';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/chat':       'Voice Chat',
  '/history':    'History',
  '/premium':    'Upgrade to Pro',
  '/settings':   'Settings',
};

export type AppNotification = {
  id: string;
  type: 'info' | 'success' | 'tip' | 'upgrade';
  title: string;
  body: string;
  time: Date;
  read: boolean;
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet, CommonModule, FooterComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private router = inject(Router);
  private elRef = inject(ElementRef);

  private settingsService = inject(SettingsService);

  isMobileSidebarOpen = false;
  notifPanelOpen = false;
  isCompactSidebar = false;

  notifications: AppNotification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Voice mode ready',
      body: 'Click the mic to start speaking. AVA will auto-send after 2 seconds of silence.',
      time: new Date(Date.now() - 2 * 60 * 1000),
      read: false
    },
    {
      id: '2',
      type: 'tip',
      title: 'Pro tip: Voice loop',
      body: 'After AVA speaks, it auto-listens again. Hold a full conversation hands-free!',
      time: new Date(Date.now() - 10 * 60 * 1000),
      read: false
    },
    {
      id: '3',
      type: 'upgrade',
      title: 'Unlock unlimited chats',
      body: 'Free tier has a daily limit. Upgrade to Pro for unlimited voice & text sessions.',
      time: new Date(Date.now() - 60 * 60 * 1000),
      read: true
    },
    {
      id: '4',
      type: 'info',
      title: 'History saved',
      body: 'Your chat sessions are automatically saved to History for later review.',
      time: new Date(Date.now() - 3 * 60 * 60 * 1000),
      read: true
    }
  ];

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileSidebarOpen = false;
      this.notifPanelOpen = false;
    });

    this.settingsService.settings$.subscribe(settings => {
      this.isCompactSidebar = settings.compactSidebar;
      if (settings.compactSidebar) {
        document.body.classList.add('compact-sidebar');
      } else {
        document.body.classList.remove('compact-sidebar');
      }
      if (settings.reduceMotion) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }
    });
  }

  get currentPageTitle(): string {
    const url = this.router.url.split('?')[0];
    return PAGE_TITLES[url] ?? 'AVA';
  }

  get isChat(): boolean {
    return this.router.url.startsWith('/chat');
  }

  get unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  toggleNotifPanel() {
    this.notifPanelOpen = !this.notifPanelOpen;
  }

  markAllRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
  }

  markRead(id: string) {
    const n = this.notifications.find(x => x.id === id);
    if (n) n.read = true;
  }

  clearAll() {
    this.notifications = [];
    this.notifPanelOpen = false;
  }

  timeAgo(date: Date): string {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }

  // Close panel on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.notifPanelOpen && !this.elRef.nativeElement.querySelector('.notif-wrapper')?.contains(event.target)) {
      this.notifPanelOpen = false;
    }
  }

  toggleSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeSidebar() {
    this.isMobileSidebarOpen = false;
  }
}
