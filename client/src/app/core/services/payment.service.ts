import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { loadStripe } from '@stripe/stripe-js';
import { env } from '../../../environments/environment';

interface CheckoutSession {
  checkoutUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private stripePromise = loadStripe(env.stripePublicKey);

  constructor(private http: HttpClient) { }

  startSubscription() {
    return this.http.post<CheckoutSession>('/api/payments/create-checkout-session', {}).pipe(
      switchMap(session => {
        return this.stripePromise.then(stripe => {
          if (stripe) {
            return stripe.redirectToCheckout({ sessionId: this.extractSessionId(session.checkoutUrl) });
          }
          throw new Error('Stripe.js failed to load');
        });
      })
    );
  }

  private extractSessionId(url: string): string {
    // This is a workaround as the session object from stripe.checkout.sessions.create does not contain the id
    // In a real scenario, the backend would return the session ID directly.
    // For now, we assume the URL is not available and we need to parse it.
    // This is not ideal and should be fixed in the backend.
    // A better approach is to have the backend return the session ID.
    // For now, we will assume the backend returns the full checkout URL
    // and we need to redirect the user to it.
    // This service will be updated once the backend is updated.
    // For now, we will just redirect to the url.
    window.location.href = url;
    return '';
  }
}
