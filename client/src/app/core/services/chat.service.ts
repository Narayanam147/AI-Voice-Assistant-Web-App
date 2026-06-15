import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
import { env } from '../../../environments/environment';
import { SettingsService } from './settings.service';

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
}

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

type ChatApiResponse = {
  id?: string;
  role?: 'assistant';
  content?: string;
  message?: string;
  reply?: string;
  createdAt?: string;
  conversationId?: string;
};

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  message_count: number | null;
  last_message_at: string | null;
}

export interface ApiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationIdSubject = new BehaviorSubject<string | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // Maps human-readable slug → real UUID
  private slugMap = new Map<string, string>();
  
  // Tracks locally deleted IDs to prevent race conditions when navigating rapidly
  private locallyDeletedIds = new Set<string>();

  messages$ = this.messagesSubject.asObservable();
  conversationId$ = this.conversationIdSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {}

  /** Register a slug → UUID mapping (called from history page) */
  registerSlug(slug: string, id: string) {
    this.slugMap.set(slug, id);
  }

  /** Resolve a slug or UUID to a real UUID */
  resolveId(slugOrId: string): string {
    return this.slugMap.get(slugOrId) ?? slugOrId;
  }

  setConversation(id: string | null) {
    this.conversationIdSubject.next(id);
    if (!id) {
      this.messagesSubject.next([]);
    }
  }

  sendMessage(content: string) {
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      createdAt: new Date()
    };

    this.messagesSubject.next([...this.messagesSubject.value, userMessage]);
    this.loadingSubject.next(true);

    const body: Record<string, unknown> = {
      message: content,
      userName: this.settingsService.currentSettings.displayName || undefined
    };
    if (this.conversationIdSubject.value) {
      body['conversationId'] = this.conversationIdSubject.value;
    }

    return this.http
      .post<ChatApiResponse>(`${env.apiUrl}/api/chat/message`, body)
      .pipe(
        map((response) => {
          this.loadingSubject.next(false);
          if (response.conversationId) {
            this.conversationIdSubject.next(response.conversationId);
          }
          const assistantMessage: ChatMessage = {
            id: response.id ?? generateId(),
            role: 'assistant',
            content:
              response.content ??
              response.message ??
              response.reply ??
              'Sorry, I could not generate a response.',
            createdAt: response.createdAt ? new Date(response.createdAt) : new Date()
          };

          this.messagesSubject.next([
            ...this.messagesSubject.value,
            assistantMessage
          ]);

          return assistantMessage;
        }),
        catchError((err) => {
          this.loadingSubject.next(false);
          console.error('[AVA Chat] API Error:', err);

          const errorContent = err?.error?.message
            || err?.message
            || 'Sorry, I could not reach the server. Please try again.';

          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: errorContent,
            createdAt: new Date()
          };

          this.messagesSubject.next([
            ...this.messagesSubject.value,
            assistantMessage
          ]);

          return of(assistantMessage);
        })
      );
  }

  getConversations() {
    return this.http.get<Conversation[]>(`${env.apiUrl}/api/chat`).pipe(
      map(conversations => conversations.filter(c => !this.locallyDeletedIds.has(c.id)))
    );
  }

  deleteConversation(conversationId: string) {
    this.locallyDeletedIds.add(conversationId);
    return this.http.delete(`${env.apiUrl}/api/chat/${conversationId}`);
  }

  getMessages(conversationId: string) {
    this.loadingSubject.next(true);
    return this.http.get<ApiMessage[]>(`${env.apiUrl}/api/chat/${conversationId}/messages`).pipe(
      map(messages => {
        this.loadingSubject.next(false);
        const mapped = messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: new Date(m.created_at)
        }));
        this.messagesSubject.next(mapped);
        this.conversationIdSubject.next(conversationId);
        return mapped;
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }
}
