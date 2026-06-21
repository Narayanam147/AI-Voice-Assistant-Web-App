import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ChatService } from '../../core/services/chat.service';
import { VoiceService, SpeakerStatus } from '../../core/services/voice.service';
import { SettingsService } from '../../core/services/settings.service';
import { MarkdownPipe } from '../../core/pipes/markdown.pipe';

type DisplayMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;          // full content
  displayContent: string;   // what's shown (for typing animation)
  createdAt: Date;
  isTyping: boolean;        // true while word-by-word animation is running
};

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MarkdownPipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messageControl = new FormControl('', { nonNullable: true });
  messages: DisplayMessage[] = [];
  voiceStatus: 'idle' | 'listening' | 'error' | 'unavailable' = 'idle';
  speakerStatus: SpeakerStatus = 'idle';
  voiceError = '';
  isLoading = false;

  // Voice conversation mode — auto-listen after AVA finishes speaking
  voiceConversationMode = false;

  private destroyed$ = new Subject<void>();
  private initialText = '';
  private typingTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private voiceService: VoiceService,
    private chatService: ChatService,
    private settingsService: SettingsService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.route.queryParams.pipe(takeUntil(this.destroyed$)).subscribe(params => {
      if (params['id']) {
        // Resolve slug → real UUID if needed
        const realId = this.chatService.resolveId(params['id']);
        this.chatService.getMessages(realId).subscribe();
      } else {
        this.chatService.setConversation(null);
      }
    });

    // Voice transcript → put in input
    this.voiceService.state$.pipe(takeUntil(this.destroyed$)).subscribe((state) => {
      this.voiceStatus = state.status;
      this.voiceError = state.error ?? '';

      if (state.status === 'listening' && state.transcript) {
        this.messageControl.setValue(state.transcript);
      }
      this.cdr.detectChanges();
    });

    // Auto-send after 2s silence
    this.voiceService.autoSend$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
      const text = this.messageControl.value.trim();
      if (text) {
        console.log('[Chat] Auto-sending after silence:', text);
        this.sendMessage();
      }
    });

    // Auto-listen after AVA finishes speaking
    this.voiceService.speakerState$.pipe(takeUntil(this.destroyed$)).subscribe((state) => {
      this.speakerStatus = state;

      if (state === 'idle' && this.voiceConversationMode && this.voiceStatus !== 'listening') {
        setTimeout(() => {
          if (this.voiceConversationMode && this.speakerStatus === 'idle') {
            const autoListenEnabled = this.settingsService.currentSettings.autoListen;
            if (autoListenEnabled) {
              this.initialText = '';
              this.voiceService.start();
            } else {
              this.voiceConversationMode = false;
            }
          }
        }, 500);
      }
      this.cdr.detectChanges();
    });

    this.chatService.messages$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((rawMessages) => {
        const prevLen = this.messages.length;
        const addedCount = rawMessages.length - prevLen;
        const lastRaw = rawMessages[rawMessages.length - 1];

        // Only animate if EXACTLY 1 new assistant message was added (live reply)
        // If many messages loaded at once (history), show all instantly
        const isLiveReply = addedCount === 1 && lastRaw?.role === 'assistant';
        const isHistoryLoad = addedCount > 1 || (addedCount === 1 && prevLen === 0 && rawMessages.length > 1);

        // Map all messages
        this.messages = rawMessages.map((m, i) => {
          const existing = i < prevLen ? this.messages[i] : null;
          if (existing && existing.content === m.content && existing.id === m.id) return existing; // preserve typing state

          // Show instantly: user messages, history loads, already-existing messages
          const showInstantly = m.role === 'user' || isHistoryLoad;
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            displayContent: showInstantly ? m.content : '',
            createdAt: m.createdAt,
            isTyping: false
          };
        });

        if (isLiveReply) {
          const idx = this.messages.length - 1;
          this.startTypingAnimation(idx);
          if (this.voiceConversationMode) {
            this.voiceService.speak(lastRaw.content);
          }
        }

        this.scrollToBottom();
        this.cdr.detectChanges();
      });

    this.chatService.loading$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((loading) => {
        this.isLoading = loading;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy() {
    this.voiceService.stop();
    this.voiceService.cancelSpeaking();
    this.voiceConversationMode = false;
    this.clearTypingTimers();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  /** Word-by-word typing animation for AI message at given index */
  private startTypingAnimation(index: number) {
    const msg = this.messages[index];
    if (!msg) return;

    const words = msg.content.split(/(\s+)/); // preserve whitespace
    let wordIdx = 0;
    msg.isTyping = true;
    msg.displayContent = '';

    const WORDS_PER_TICK = 2;  // 2 words per tick for speed
    const TICK_MS = 40;        // 40ms per tick = fast but visible

    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        if (wordIdx >= words.length) {
          msg.isTyping = false;
          msg.displayContent = msg.content;
          this.ngZone.run(() => this.cdr.detectChanges());
          return;
        }

        // Add a batch of words
        for (let i = 0; i < WORDS_PER_TICK && wordIdx < words.length; i++, wordIdx++) {
          msg.displayContent += words[wordIdx];
        }

        this.ngZone.run(() => {
          this.scrollToBottom();
          this.cdr.detectChanges();
        });

        const timer = setTimeout(tick, TICK_MS);
        this.typingTimers.push(timer);
      };

      tick();
    });
  }

  private clearTypingTimers() {
    this.typingTimers.forEach(t => clearTimeout(t));
    this.typingTimers = [];
  }

  // Toggle mic
  toggleListening() {
    if (this.voiceStatus === 'listening') {
      this.voiceService.stop();
      this.voiceConversationMode = false;

      setTimeout(() => {
        if (this.messageControl.value.trim()) {
          this.voiceConversationMode = true;
          this.sendMessage();
        }
      }, 100);
      return;
    }

    if (this.voiceStatus !== 'unavailable') {
      this.voiceConversationMode = true;
      this.initialText = this.messageControl.value;
      this.voiceService.start();
    }
  }

  sendMessage() {
    const value = this.messageControl.value.trim();
    if (!value || this.isLoading) return;

    this.voiceService.stop();
    this.messageControl.setValue('');
    this.initialText = '';
    this.chatService.sendMessage(value).subscribe();
  }

  editingMessageId: string | null = null;
  editingContent = '';

  startEditMessage(messageId: string, content: string) {
    this.editingMessageId = messageId;
    this.editingContent = content;
  }

  cancelEditMessage() {
    this.editingMessageId = null;
    this.editingContent = '';
  }

  saveEditMessage(messageId: string) {
    const text = this.editingContent.trim();
    if (!text || this.isLoading) return;

    this.cancelEditMessage();
    this.chatService.editMessage(messageId, text).subscribe();
  }

  useSuggestion(text: string) {
    this.messageControl.setValue(text);
    this.sendMessage();
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  speakMessage(content: string) {
    this.voiceService.speak(content);
  }

  pauseSpeaking() {
    this.voiceService.pauseSpeaking();
  }

  resumeSpeaking() {
    this.voiceService.resumeSpeaking();
  }

  cancelSpeaking() {
    this.voiceService.cancelSpeaking();
    this.voiceConversationMode = false;
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      try {
        if (this.scrollContainer) {
          const el = this.scrollContainer.nativeElement;
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        }
      } catch (e) { /* ignore */ }
    });
  }
}
