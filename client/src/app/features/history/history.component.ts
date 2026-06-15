import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';

type HistorySession = {
  id: string;
  slug: string;
  title: string;
  messageCount: number;
  date: string;
  relativeTime: string;
  deleted: boolean;   // soft-delete flag
};

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit, OnDestroy {
  sessions: HistorySession[] = [];
  isLoading = true;
  searchQuery = '';

  // Undo toast state
  undoVisible = false;
  undoTitle = '';
  private pendingDeleteId = '';
  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private chatService: ChatService, private router: Router) {}

  ngOnInit() {
    this.loadHistory();
  }

  ngOnDestroy() {
    this.commitPendingDeletion();
  }

  get filteredSessions(): HistorySession[] {
    const q = this.searchQuery.toLowerCase().trim();
    return this.sessions.filter(s => {
      if (s.deleted) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q);
    });
  }

  loadHistory() {
    this.isLoading = true;
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.sessions = data.map(s => ({
          id: s.id,
          slug: this.toSlug(s.title, s.id),
          title: s.title || 'Untitled Chat',
          messageCount: s.message_count ?? 0,
          date: s.last_message_at ? this.formatDate(new Date(s.last_message_at)) : 'No messages',
          relativeTime: s.last_message_at ? this.timeAgo(new Date(s.last_message_at)) : 'No messages',
          deleted: false
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openChat(session: HistorySession) {
    this.chatService.registerSlug(session.slug, session.id);
    this.router.navigate(['/chat'], { queryParams: { id: session.slug } });
  }

  deleteSession(event: MouseEvent, session: HistorySession) {
    event.stopPropagation();
    
    // Commit any previously pending deletion before starting a new one
    this.commitPendingDeletion();

    session.deleted = true;
    this.pendingDeleteId = session.id;
    this.undoTitle = session.title;
    this.undoVisible = true;

    this.undoTimer = setTimeout(() => {
      this.commitPendingDeletion();
    }, 5000);
  }

  undoDelete() {
    if (!this.pendingDeleteId) return;
    
    const session = this.sessions.find(s => s.id === this.pendingDeleteId);
    if (session) session.deleted = false;
    
    this.clearUndoState();
  }

  private commitPendingDeletion() {
    if (!this.pendingDeleteId) return;
    
    // Fire and forget backend deletion
    this.chatService.deleteConversation(this.pendingDeleteId).subscribe();
    
    // Remove from local array completely
    this.sessions = this.sessions.filter(s => s.id !== this.pendingDeleteId);
    
    this.clearUndoState();
  }

  private clearUndoState() {
    this.undoVisible = false;
    this.pendingDeleteId = '';
    if (this.undoTimer) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }

  // ── URL / time helpers ───────────────────────────────────

  private toSlug(title: string, id: string): string {
    const short = id.replace(/-/g, '').slice(0, 8);
    const slug = (title || 'chat')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);
    return `${slug}-${short}`;
  }

  private formatDate(d: Date): string {
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' }) +
      ` ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  private timeAgo(d: Date): string {
    const secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  }
}
