import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SettingsService } from './settings.service';

export type VoiceStatus = 'idle' | 'listening' | 'error' | 'unavailable';
export type SpeakerStatus = 'idle' | 'speaking' | 'paused';

export type VoiceState = {
  status: VoiceStatus;
  transcript: string;
  interimTranscript: string;
  error?: string;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

const SILENCE_AUTO_SEND_MS = 2000; // 2s of silence → auto-send

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private recognition?: SpeechRecognition;
  private stateSubject = new BehaviorSubject<VoiceState>({
    status: 'idle',
    transcript: '',
    interimTranscript: ''
  });
  private speakerSubject = new BehaviorSubject<SpeakerStatus>('idle');
  private isListeningIntentional = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  // Emits when silence auto-send should trigger
  readonly autoSend$ = new Subject<void>();

  state$ = this.stateSubject.asObservable();
  speakerState$ = this.speakerSubject.asObservable();

  constructor(private settingsService: SettingsService) {
    const SpeechRecognitionRef =
      (window as typeof window & { SpeechRecognition?: SpeechRecognitionConstructor }).
        SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).
        webkitSpeechRecognition;

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        console.log('[AVA Voice] Voices loaded:', window.speechSynthesis.getVoices().length);
      };
      window.speechSynthesis.getVoices(); // trigger load
    }

    if (!SpeechRecognitionRef) {
      console.warn('[AVA Voice] SpeechRecognition API not available in this browser.');
      this.stateSubject.next({ status: 'unavailable', transcript: '', interimTranscript: '' });
      return;
    }

    this.recognition = new SpeechRecognitionRef();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    console.log('[AVA Voice] SpeechRecognition initialized.');

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      const fullText = (final + ' ' + interim).trim();
      console.log('[AVA Voice] Transcript:', fullText);

      const current = this.stateSubject.value;
      this.stateSubject.next({ ...current, transcript: fullText, interimTranscript: '' });

      if (final) {
        // Speech segment finalized — start 2s silence countdown
        this.resetSilenceTimer(fullText);
      } else {
        // Still getting interim results — reset timer to keep listening
        this.clearSilenceTimer();
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[AVA Voice] Error:', event.error);

      if (event.error === 'no-speech') {
        // No speech detected — start silence timer if we have text
        const current = this.stateSubject.value;
        if (current.transcript) {
          this.startSilenceTimer();
        }
        return;
      }

      this.isListeningIntentional = false;
      this.clearSilenceTimer();
      this.stateSubject.next({
        status: 'error',
        transcript: '',
        interimTranscript: '',
        error: event.error
      });
    };

    this.recognition.onend = () => {
      console.log('[AVA Voice] Recognition ended. Intentional:', this.isListeningIntentional);

      if (this.isListeningIntentional) {
        console.log('[AVA Voice] Auto-restarting...');
        try {
          this.recognition!.start();
        } catch (e) {
          console.error('[AVA Voice] Failed to restart:', e);
          this.isListeningIntentional = false;
          const current = this.stateSubject.value;
          this.stateSubject.next({ ...current, status: 'idle' });
        }
        return;
      }

      const current = this.stateSubject.value;
      if (current.status === 'listening') {
        this.stateSubject.next({ ...current, status: 'idle' });
      }
    };
  }

  private resetSilenceTimer(transcript: string) {
    this.clearSilenceTimer();
    if (transcript) {
      // After every new result, schedule a send if no more speech
      this.silenceTimer = setTimeout(() => {
        console.log('[AVA Voice] Silence detected — auto-sending...');
        this.stop();
        this.autoSend$.next();
      }, SILENCE_AUTO_SEND_MS);
    }
  }

  private startSilenceTimer() {
    const current = this.stateSubject.value;
    if (current.transcript) {
      this.resetSilenceTimer(current.transcript);
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  start() {
    if (!this.recognition) return;
    console.log('[AVA Voice] Starting...');
    this.isListeningIntentional = true;
    this.clearSilenceTimer();
    this.stateSubject.next({ status: 'listening', transcript: '', interimTranscript: '' });
    try {
      this.recognition.start();
    } catch (e) {
      console.error('[AVA Voice] Failed to start:', e);
      this.isListeningIntentional = false;
      this.stateSubject.next({ status: 'error', transcript: '', interimTranscript: '', error: 'Failed to start' });
    }
  }

  stop() {
    if (!this.recognition) return;
    console.log('[AVA Voice] Stopping...');
    this.isListeningIntentional = false;
    this.clearSilenceTimer();
    try {
      this.recognition.stop();
    } catch (e) {}
  }

  speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const persona = this.settingsService.currentPersona;
    const settings = this.settingsService.currentSettings;

    // Pick best matching system voice
    const allVoices = window.speechSynthesis.getVoices();
    let voice: SpeechSynthesisVoice | null = null;

    // Use user-selected language, or fallback to persona preference if user is on default en-US
    const targetLang = (settings.voiceLanguage === 'en-US' && persona.langPreference) 
      ? persona.langPreference 
      : settings.voiceLanguage;

    if (allVoices.length > 0) {
      // Try to match language + gender keyword
      const langVoices = allVoices.filter(v =>
        v.lang.startsWith(targetLang.split('-')[0])
      );
      const targeted = langVoices.filter(v => {
        const name = v.name.toLowerCase();
        if (persona.genderPreference === 'female') {
          return name.includes('female') || name.includes('woman') ||
                 name.includes('zira') || name.includes('samantha') ||
                 name.includes('victoria') || name.includes('karen') ||
                 name.includes('moira') || name.includes('tessa') ||
                 name.includes('fiona') || name.includes('ava') ||
                 (!name.includes('male') && !name.includes('david') &&
                  !name.includes('george') && !name.includes('mark'));
        }
        if (persona.genderPreference === 'male') {
          return name.includes('male') || name.includes('david') ||
                 name.includes('george') || name.includes('mark') ||
                 name.includes('daniel') || name.includes('alex') ||
                 name.includes('fred') || name.includes('thomas');
        }
        return true;
      });
      voice = targeted[0] ?? langVoices[0] ?? allVoices[0];
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = targetLang;
    utterance.pitch = persona.pitch;
    utterance.rate = persona.rate * settings.voiceSpeed;
    utterance.volume = 1;

    utterance.onstart = () => this.speakerSubject.next('speaking');
    utterance.onend = () => this.speakerSubject.next('idle');
    utterance.onerror = () => this.speakerSubject.next('idle');
    utterance.onpause = () => this.speakerSubject.next('paused');
    utterance.onresume = () => this.speakerSubject.next('speaking');
    window.speechSynthesis.speak(utterance);
  }

  pauseSpeaking() { if (window.speechSynthesis) window.speechSynthesis.pause(); }
  resumeSpeaking() { if (window.speechSynthesis) window.speechSynthesis.resume(); }
  cancelSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.speakerSubject.next('idle');
    }
  }
}
