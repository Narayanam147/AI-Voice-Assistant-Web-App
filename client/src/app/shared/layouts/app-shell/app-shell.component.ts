import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { CommonModule } from '@angular/common';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/chat':       'Voice Chat',
  '/history':    'History',
  '/premium':    'Upgrade to Pro',
  '/settings':   'Settings',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet, CommonModule],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private router = inject(Router);

  pageTitle$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map((e: any) => {
      const url = e.urlAfterRedirects.split('?')[0];
      return PAGE_TITLES[url] ?? 'AVA';
    })
  );



  isMobileSidebarOpen = false;

  constructor() {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobileSidebarOpen = false;
    });
  }

  toggleSidebar() {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeSidebar() {
    this.isMobileSidebarOpen = false;
  }

  get currentPageTitle(): string {
    const url = this.router.url.split('?')[0];
    return PAGE_TITLES[url] ?? 'AVA';
  }

  get isChat(): boolean {
    return this.router.url.startsWith('/chat');
  }
}
