import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  sessions: any[] = [];
  isLoading = true;
  searchQuery = '';

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.loadHistory();
  }

  get filteredSessions() {
    if (!this.searchQuery) return this.sessions;
    return this.sessions.filter(s => 
      s.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
      s.description.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  loadHistory() {
    this.isLoading = true;
    this.chatService.getConversations().subscribe({
      next: (data) => {
        this.sessions = data.map(s => ({
          id: s.id,
          title: s.title,
          description: `Conversation with ${s.message_count} messages.`,
          status: 'Completed',
          date: new Date(s.last_message_at).toLocaleDateString() + ', ' + new Date(s.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: '--',
          iconClass: 'pulse-blue'
        }));
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
