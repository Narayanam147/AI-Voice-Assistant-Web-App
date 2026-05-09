import { Injectable } from '@angular/core';
import { BehaviorSubject, from, map, Observable } from 'rxjs';

import { supabaseClient } from '../supabase/supabase.client';
import type { SupabaseSession } from '../supabase/supabase.types';

@Injectable({ providedIn: 'root' })
export class SupabaseAuthService {
  private sessionSubject = new BehaviorSubject<SupabaseSession | null>(null);

  session$ = this.sessionSubject.asObservable();

  constructor() {
    this.initSession();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      this.sessionSubject.next(session as SupabaseSession | null);
    });
  }

  isAuthenticated() {
    return Boolean(this.sessionSubject.value?.access_token);
  }

  getAccessToken() {
    return this.sessionSubject.value?.access_token ?? null;
  }

  signUp(email: string, password: string) {
    return from(supabaseClient.auth.signUp({ email, password }));
  }

  signIn(email: string, password: string) {
    return from(supabaseClient.auth.signInWithPassword({ email, password }));
  }

  signInWithGoogle(redirectTo?: string) {
    return from(
      supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    );
  }

  signOut(): Observable<void> {
    return from(supabaseClient.auth.signOut()).pipe(map(() => undefined));
  }

  private async initSession() {
    const { data } = await supabaseClient.auth.getSession();
    this.sessionSubject.next(data.session as SupabaseSession | null);
  }
}
