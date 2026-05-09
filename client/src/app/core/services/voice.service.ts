import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type VoiceStatus = 'idle' | 'listening' | 'error' | 'unavailable';
export type SpeakerStatus = 'idle' | 'speaking' | 'paused';

export type VoiceState = {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  error?: string;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition?: SpeechRecognition;
  private stateSubject = new BehaviorSubject<VoiceState>({
    status: 'idle',
    transcript: '',
    interimTranscript: ''
  });
  private speakerSubject = new BehaviorSubject<SpeakerStatus>('idle');

  state$ = this.stateSubject.asObservable();
  speakerState$ = this.speakerSubject.asObservable();

  constructor() {
    const SpeechRecognitionRef =
      (window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor }).
        SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).
        webkitSpeechRecognition;

    if (!SpeechRecognitionRef) {
      this.stateSubject.next({ status: 'unavailable', transcript: '', interimTranscript: '' });
      return;
    }

    this.recognition = new SpeechRecognitionRef();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const current = this.stateSubject.value;
      if (final) {
        this.stateSubject.next({ ...current, transcript: final.trim() });
      } else {
        this.stateSubject.next({ ...current, interimTranscript: interim });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.stateSubject.next({
        status: 'error',
        transcript: '',
        interimTranscript: '',
        error: event.error
      });
    };

    this.recognition.onend = () => {
      const current = this.stateSubject.value;
      if (current.status === 'listening') {
        this.stateSubject.next({ ...current, status: 'idle' });
      }
    };
  }

  start() {
    if (!this.recognition) return;
    this.stateSubject.next({ status: 'listening', transcript: '', interimTranscript: '' });
    try {
      this.recognition.start();
    } catch(e) {}
  }

  stop() {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch(e) {}
  }

  speak(text: string) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onstart = () => this.speakerSubject.next('speaking');
    utterance.onend = () => this.speakerSubject.next('idle');
    utterance.onerror = () => this.speakerSubject.next('idle');
    utterance.onpause = () => this.speakerSubject.next('paused');
    utterance.onresume = () => this.speakerSubject.next('speaking');

    window.speechSynthesis.speak(utterance);
  }

  pauseSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.pause();
  }

  resumeSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.resume();
  }

  cancelSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speakerSubject.next('idle');
    }
  }
}
