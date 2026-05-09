import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, of } from 'rxjs';
import { env } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private conversationIdSubject = new BehaviorSubject<string | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  messages$ = this.messagesSubject.asObservable();
  conversationId$ = this.conversationIdSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

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

    const body: Record<string, unknown> = { message: content };
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
    return this.http.get<any[]>(`${env.apiUrl}/api/chat`);
  }
}
