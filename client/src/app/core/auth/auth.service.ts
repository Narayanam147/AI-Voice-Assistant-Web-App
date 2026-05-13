import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { SupabaseAuthService } from './supabase-auth.service';
import { env } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  get session$() {
    return this.supabase.session$;
  }

  constructor(private supabase: SupabaseAuthService) {}

  isAuthenticated() {
    return this.supabase.isAuthenticated();
  }

  getAccessToken() {
    return this.supabase.getAccessToken();
  }

  register(payload: { email: string; password: string }) {
    return this.supabase.signUp(payload.email, payload.password).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  login(payload: { email: string; password: string }) {
    return this.supabase.signIn(payload.email, payload.password).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  loginWithGoogle() {
    return this.supabase.signInWithGoogle(window.location.origin).pipe(
      map(({ error }) => {
        if (error) {
          throw error;
        }
      })
    );
  }

  logout(): Observable<void> {
    return this.supabase.signOut();
  }
}
