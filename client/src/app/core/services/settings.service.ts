import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabaseClient } from '../supabase/supabase.client';

export interface VoicePersona {
  id: string;
  label: string;
  description: string;
  icon: string;
  proOnly: boolean;
  pitch: number;
  rate: number;
  langPreference: string;   // preferred voice lang filter
  genderPreference: 'female' | 'male' | 'any';
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'default',
    label: 'AVA (Default)',
    description: 'Standard clear female voice',
    icon: '🎤',
    proOnly: false,
    pitch: 1.0,
    rate: 1.0,
    langPreference: 'en-US',
    genderPreference: 'female',
  },
  {
    id: 'professional',
    label: 'Professional',
    description: 'Calm, authoritative female',
    icon: '💼',
    proOnly: true,
    pitch: 1.0,
    rate: 0.9,
    langPreference: 'en-US',
    genderPreference: 'female',
  },
  {
    id: 'friendly-male',
    label: 'Friendly (Male)',
    description: 'Warm, approachable male voice',
    icon: '👨',
    proOnly: true,
    pitch: 0.85,
    rate: 1.0,
    langPreference: 'en-US',
    genderPreference: 'male',
  },
  {
    id: 'british',
    label: 'AVA British',
    description: 'UK English female accent',
    icon: '🇬🇧',
    proOnly: true,
    pitch: 1.05,
    rate: 0.9,
    langPreference: 'en-GB',
    genderPreference: 'female',
  },
  {
    id: 'child',
    label: 'Child',
    description: 'Bright, enthusiastic young voice',
    icon: '🧒',
    proOnly: true,
    pitch: 1.5,
    rate: 1.1,
    langPreference: 'en-US',
    genderPreference: 'female',
  },
  {
    id: 'deep',
    label: 'Deep',
    description: 'Deep, authoritative male voice',
    icon: '🎙️',
    proOnly: true,
    pitch: 0.6,
    rate: 0.95,
    langPreference: 'en-US',
    genderPreference: 'male',
  },
];

export interface UserSettings {
  displayName: string;
  voiceLanguage: string;
  autoListen: boolean;
  voiceSpeed: number;
  voicePersonaId: string;
  reduceMotion: boolean;
  compactSidebar: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  voiceLanguage: 'en-US',
  autoListen: true,
  voiceSpeed: 1.0,
  voicePersonaId: 'default',
  reduceMotion: false,
  compactSidebar: false,
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'ava_user_settings';

  private settingsSubject = new BehaviorSubject<UserSettings>(this.loadSettings());
  settings$ = this.settingsSubject.asObservable();

  readonly personas = VOICE_PERSONAS;

  constructor() {
    // Sync settings from Supabase user metadata when logged in
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.user_metadata?.['settings']) {
        const remoteSettings = session.user.user_metadata['settings'] as UserSettings;
        const merged = { ...DEFAULT_SETTINGS, ...this.loadSettings(), ...remoteSettings };
        this.settingsSubject.next(merged);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
      }
    });
  }

  get currentSettings(): UserSettings {
    return this.settingsSubject.value;
  }

  get currentPersona(): VoicePersona {
    return VOICE_PERSONAS.find(p => p.id === this.currentSettings.voicePersonaId)
      ?? VOICE_PERSONAS[0];
  }

  updateSettings(partial: Partial<UserSettings>) {
    const next = { ...this.currentSettings, ...partial };
    this.settingsSubject.next(next);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(next));

    // Persist to Supabase Auth User Metadata for full-stack backup
    supabaseClient.auth.updateUser({
      data: { settings: next }
    }).catch(err => console.error('[SettingsService] Supabase sync error:', err));
  }

  private loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    return DEFAULT_SETTINGS;
  }
}
