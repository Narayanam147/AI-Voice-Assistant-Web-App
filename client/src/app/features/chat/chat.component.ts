import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { ChatService } from '../../core/services/chat.service';
import { VoiceService, SpeakerStatus } from '../../core/services/voice.service';
import { WaveformVisualizerComponent } from '../../shared/components/waveform-visualizer/waveform-visualizer.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, WaveformVisualizerComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messageControl = new FormControl('', { nonNullable: true });
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: Date }> = [];
  voiceStatus: 'idle' | 'listening' | 'error' | 'unavailable' = 'idle';
  speakerStatus: SpeakerStatus = 'idle';
  voiceError = '';
  isLoading = false;

  private destroyed$ = new Subject<void>();
  private shouldScroll = false;
  private initialText = '';

  constructor(
    private voiceService: VoiceService,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.voiceService.state$.pipe(takeUntil(this.destroyed$)).subscribe((state) => {
      this.voiceStatus = state.status;
      this.voiceError = state.error ?? '';

      if (state.status === 'listening' && state.interimTranscript) {
        const fullText = (this.initialText + (this.initialText ? ' ' : '') + state.interimTranscript).trim();
        this.messageControl.setValue(fullText);
      } else if (state.transcript) {
        const fullText = (this.initialText + (this.initialText ? ' ' : '') + state.transcript).trim();
        this.messageControl.setValue(fullText);
        this.initialText = fullText; // update initial text in case they keep talking
      }
    });

    this.voiceService.speakerState$.pipe(takeUntil(this.destroyed$)).subscribe((state) => {
      this.speakerStatus = state;
    });

    this.chatService.messages$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((messages) => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'assistant' && messages.length > this.messages.length) {
          this.voiceService.speak(lastMessage.content);
        }
        this.messages = messages;
        this.shouldScroll = true;
      });

    this.chatService.loading$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((loading) => {
        this.isLoading = loading;
      });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() {
    this.voiceService.stop();
    this.voiceService.cancelSpeaking();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  toggleListening() {
    if (this.voiceStatus === 'listening') {
      this.voiceService.stop();
      return;
    }

    if (this.voiceStatus !== 'unavailable') {
      this.initialText = this.messageControl.value;
      this.voiceService.start();
    }
  }

  sendMessage() {
    const value = this.messageControl.value.trim();
    if (!value || this.isLoading) {
      return;
    }

    this.voiceService.stop();
    this.messageControl.setValue('');
    this.initialText = '';
    this.chatService.sendMessage(value).subscribe();
  }

  useSuggestion(text: string) {
    this.messageControl.setValue(text);
    this.sendMessage();
  }

  pauseSpeaking() {
    this.voiceService.pauseSpeaking();
  }

  resumeSpeaking() {
    this.voiceService.resumeSpeaking();
  }

  cancelSpeaking() {
    this.voiceService.cancelSpeaking();
  }

  private scrollToBottom() {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (e) { /* ignore */ }
  }
}
