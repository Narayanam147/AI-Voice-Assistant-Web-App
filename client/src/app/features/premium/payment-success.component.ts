import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, take, switchMap, timeout, catchError } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { PaymentService } from '../../core/services/payment.service';
import { AuthService } from '../../core/auth/auth.service';

type PageState = 'verifying' | 'success' | 'failed' | 'not_logged_in';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="result-page">

      <!-- Verifying -->
      <div class="result-card" *ngIf="state === 'verifying'">
        <div class="icon-wrap verifying-icon">
          <span class="spinner"></span>
        </div>
        <h1>Confirming your payment…</h1>
        <p>Please wait while we activate your Pro plan.</p>
      </div>

      <!-- Success -->
      <div class="result-card success-card" *ngIf="state === 'success'">
        <div class="icon-wrap success-icon">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9 11 12 14 22 4"/>
          </svg>
        </div>
        <h1>You're now Pro! 🎉</h1>
        <p>Your subscription is active. Enjoy unlimited voice minutes, priority processing, and all premium features.</p>
        <p class="redirect-note">Redirecting to dashboard in {{ countdown }}s…</p>
        <a routerLink="/dashboard" class="result-btn">Go to Dashboard</a>
      </div>

      <!-- Not logged in -->
      <div class="result-card fail-card" *ngIf="state === 'not_logged_in'">
        <div class="icon-wrap fail-icon">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1>Session expired</h1>
        <p>Your payment was likely successful. Please log in again to activate your Pro plan.</p>
        <a routerLink="/auth/login" class="result-btn">Log In</a>
      </div>

      <!-- Failed -->
      <div class="result-card fail-card" *ngIf="state === 'failed'">
        <div class="icon-wrap fail-icon">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1>Verification failed</h1>
        <p>We couldn't confirm your payment. Contact support if you were charged.</p>
        <a routerLink="/premium" class="result-btn">Back to Premium</a>
      </div>

    </div>
  `,
  styles: [`
    .result-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: var(--surface-bg, #0f0f13);
    }
    .result-card {
      max-width: 480px;
      width: 100%;
      text-align: center;
      padding: 3.5rem 3rem;
      border-radius: 20px;
      border: 1px solid var(--border-color, rgba(255,255,255,0.08));
      background: rgba(255,255,255,0.03);
      backdrop-filter: blur(12px);
      animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    .icon-wrap {
      width: 80px; height: 80px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .success-icon   { background: rgba(16,185,129,0.15); color: #10b981; border: 2px solid rgba(16,185,129,0.4); }
    .fail-icon      { background: rgba(239,68,68,0.12);  color: #ef4444; border: 2px solid rgba(239,68,68,0.35); }
    .verifying-icon { background: rgba(99,102,241,0.12); color: #6366f1; border: 2px solid rgba(99,102,241,0.35); }
    h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 1rem; color: #fff; }
    p  { color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 1rem; }
    .redirect-note { font-size: 0.85rem; opacity: 0.5; margin-bottom: 1.5rem; }
    .result-btn {
      display: inline-block; padding: 0.85rem 2rem; border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white; font-weight: 600; text-decoration: none; transition: all 0.2s;
    }
    .result-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(99,102,241,0.25);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PaymentSuccessComponent implements OnInit {
  state: PageState = 'verifying';
  countdown = 3;
  private sessionId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id');

    if (!this.sessionId) {
      // No session ID — shouldn't happen, but redirect to premium gracefully
      this.router.navigate(['/premium']);
      return;
    }

    // Wait for Supabase to restore the session from localStorage before proceeding.
    // session$ starts as null (BehaviorSubject init), then gets the real value async.
    // We skip the initial null and take the first real emission.
    // timeout(5000) handles the case where the user is not logged in at all.
    this.authService.session$.pipe(
      filter(session => session !== null),
      take(1),
      timeout(5000),
      switchMap(() => {
        if (!this.authService.getAccessToken()) {
          return of(null); // Not authenticated
        }
        return this.paymentService.verifySession(this.sessionId!);
      }),
      catchError(() => of(null)) // timeout or any other error
    ).subscribe({
      next: (result) => {
        if (result === null) {
          this.state = 'not_logged_in';
        } else if (result.success) {
          this.state = 'success';
          this.startCountdown();
        } else {
          this.state = 'failed';
        }
      },
      error: () => {
        this.state = 'not_logged_in';
      }
    });
  }

  private startCountdown() {
    const interval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(interval);
        this.router.navigate(['/dashboard']);
      }
    }, 1000);
  }
}
