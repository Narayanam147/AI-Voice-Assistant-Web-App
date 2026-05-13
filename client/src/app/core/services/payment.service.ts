import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { env } from '../../../environments/environment';

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
  private readonly base = `${env.apiUrl}/api/payments`;

  constructor(private http: HttpClient) { }

  startSubscription(): Observable<void> {
    return this.http.post<CheckoutSession>(`${this.base}/create-checkout-session`, {}).pipe(
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

  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.http.get<SubscriptionStatus>(`${this.base}/subscription-status`);
  }

  verifySession(sessionId: string): Observable<{ success: boolean; role: string }> {
    return this.http.post<{ success: boolean; role: string }>(`${this.base}/verify-session`, { sessionId });
  }

  createSubscriptionIntent(): Observable<{ clientSecret: string; subscriptionId: string }> {
    return this.http.post<{ clientSecret: string; subscriptionId: string }>(
      `${this.base}/create-subscription-intent`, {}
    );
  }

  activatePremium(subscriptionId: string): Observable<{ success: boolean; role: string }> {
    return this.http.post<{ success: boolean; role: string }>(
      `${this.base}/activate-premium`, { subscriptionId }
    );
  }
}
