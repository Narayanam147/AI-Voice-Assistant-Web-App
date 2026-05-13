import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

interface CheckoutSession {
  checkoutUrl: string;
}

export interface SubscriptionStatus {
  role: 'user' | 'premium' | 'admin';
  stripe_customer_id: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor(private http: HttpClient) { }

  /**
   * Creates a Stripe Checkout session on the backend and redirects
   * the browser to the Stripe-hosted payment page.
   */
  startSubscription(): Observable<void> {
    return this.http.post<CheckoutSession>('/api/payments/create-checkout-session', {}).pipe(
      tap(session => {
        if (session?.checkoutUrl) {
          window.location.href = session.checkoutUrl;
        } else {
          throw new Error('No checkout URL returned from server.');
        }
      }),
      switchMap(() => from(Promise.resolve()))
    );
  }

  /**
   * Returns the current user's subscription/role status from the backend.
   */
  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>('/api/payments/subscription-status');
  }

  /**
   * Verifies a completed Stripe Checkout session by session_id and upgrades
   * the user's role to premium immediately (no webhook required).
   */
  verifySession(sessionId: string): Observable<{ success: boolean; role: string }> {
    return this.http.post<{ success: boolean; role: string }>('/api/payments/verify-session', { sessionId });
  }

  /**
   * Creates an incomplete Stripe subscription and returns the clientSecret
   * for the frontend to confirm payment with Stripe Elements (embedded, no redirect).
   */
  createSubscriptionIntent(): Observable<{ clientSecret: string; subscriptionId: string }> {
    return this.http.post<{ clientSecret: string; subscriptionId: string }>(
      '/api/payments/create-subscription-intent', {}
    );
  }

  /**
   * After the frontend confirms payment with Stripe Elements, calls backend to
   * verify subscription is active and upgrade the user's DB role to 'premium'.
   */
  activatePremium(subscriptionId: string): Observable<{ success: boolean; role: string }> {
    return this.http.post<{ success: boolean; role: string }>(
      '/api/payments/activate-premium', { subscriptionId }
    );
  }
}
