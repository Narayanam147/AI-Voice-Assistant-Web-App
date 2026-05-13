import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PaymentService, SubscriptionStatus } from '../../core/services/payment.service';
import { SettingsService, UserSettings, VOICE_PERSONAS, VoicePersona } from '../../core/services/settings.service';
import { VoiceService } from '../../core/services/voice.service';

export type SettingsTab = 'profile' | 'account' | 'appearance' | 'voice';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  activeTab: SettingsTab = 'profile';

  // Profile
  userEmail = '';
  displayName = '';

  // Account / subscription
  subscriptionStatus: SubscriptionStatus | null = null;
  loadingStatus = true;

  // Voice
  settings: UserSettings;
  readonly personas: VoicePersona[] = VOICE_PERSONAS;
  previewingPersonaId: string | null = null;

  readonly voiceLanguages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-GB', label: 'English (UK)' },
    { code: 'hi-IN', label: 'Hindi (India)' },
    { code: 'es-ES', label: 'Spanish (Spain)' },
    { code: 'fr-FR', label: 'French (France)' },
    { code: 'de-DE', label: 'German' },
    { code: 'ja-JP', label: 'Japanese' },
  ];

  saveSuccess = false;
  savingName = false;

  constructor(
    private authService: AuthService,
    private paymentService: PaymentService,
    private settingsService: SettingsService,
    private voiceService: VoiceService,
    private router: Router
  ) {
    this.settings = { ...this.settingsService.currentSettings };
  }

  ngOnInit() {
    this.authService.session$.subscribe(session => {
      if (session?.user) {
        this.userEmail = session.user.email ?? '';
        // Load saved name from settings first, fallback to email prefix
        const savedName = this.settingsService.currentSettings.displayName;
        this.displayName = savedName || session.user.email?.split('@')[0] || 'User';
      }
    });

    this.paymentService.getSubscriptionStatus().subscribe({
      next: (s) => {
        this.subscriptionStatus = s;
        this.loadingStatus = false;
      },
      error: () => { this.loadingStatus = false; }
    });
  }

  get isPremium(): boolean {
    return this.subscriptionStatus?.role === 'premium' ||
           this.subscriptionStatus?.role === 'admin';
  }

  setTab(tab: SettingsTab) {
    this.activeTab = tab;
    this.saveSuccess = false;
    this.voiceService.cancelSpeaking();
    this.previewingPersonaId = null;
  }

  /** Save profile name to localStorage */
  saveProfile() {
    this.savingName = true;
    this.settingsService.updateSettings({
      ...this.settings,
      displayName: this.displayName
    });
    setTimeout(() => {
      this.savingName = false;
      this.saveSuccess = true;
      setTimeout(() => (this.saveSuccess = false), 3000);
    }, 400);
  }

  /** Save voice / appearance settings */
  saveSettings() {
    this.settings.voiceSpeed = parseFloat(this.settings.voiceSpeed as any) || 1.0;
    this.settingsService.updateSettings(this.settings);
    this.saveSuccess = true;
    setTimeout(() => (this.saveSuccess = false), 3000);
  }

  /** Select a voice persona (gated for Pro) */
  selectPersona(persona: VoicePersona) {
    if (persona.proOnly && !this.isPremium) return;
    this.settings = { ...this.settings, voicePersonaId: persona.id };
  }

  /** Preview a persona voice with a sample sentence */
  previewPersona(persona: VoicePersona, event: Event) {
    event.stopPropagation();
    if (persona.proOnly && !this.isPremium) return;

    // Temporarily apply persona for preview
    const prev = this.settingsService.currentSettings.voicePersonaId;
    this.settingsService.updateSettings({ voicePersonaId: persona.id });
    this.previewingPersonaId = persona.id;

    this.voiceService.speak(`Hi! I'm AVA using the ${persona.label} voice.`);

    // Restore after preview
    setTimeout(() => {
      this.settingsService.updateSettings({ voicePersonaId: prev });
      this.previewingPersonaId = null;
    }, 4000);
  }

  goToUpgrade() {
    this.router.navigate(['/premium']);
  }
}
