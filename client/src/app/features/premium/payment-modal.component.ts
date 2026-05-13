import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { env } from '../../../environments/environment';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        <!-- Header -->
        <div class="modal-header">
          <div class="plan-badge">AVA Pro · $19 / month</div>
          <button class="close-btn" (click)="close.emit()" aria-label="Close">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Loading Stripe -->
        <div class="loading-state" *ngIf="phase === 'loading'">
          <span class="spinner"></span>
          <p>Setting up secure payment…</p>
        </div>

        <!-- Card Form -->
        <div class="form-state" *ngIf="phase === 'form'">
          <p class="form-label">Card details</p>
          <div #cardElement class="card-element-wrap"></div>

          <div class="error-msg" *ngIf="errorMsg">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ errorMsg }}
          </div>

          <button
            id="pay-now-btn"
            class="pay-btn"
            [disabled]="isProcessing"
            (click)="pay()"
          >
            <span *ngIf="!isProcessing">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:6px;vertical-align:middle">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Pay $19.00
            </span>
            <span *ngIf="isProcessing" class="spinner-wrap">
              <span class="spinner small"></span> Processing…
            </span>
          </button>

          <p class="secure-note">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            256-bit SSL · Powered by <strong>Stripe</strong> · Cancel anytime
          </p>
        </div>

        <!-- Success -->
        <div class="result-state" *ngIf="phase === 'success'">
          <div class="result-icon success">
            <svg width="36" height="36" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><polyline points="9 11 12 14 22 4"/>
            </svg>
          </div>
          <h2>You're now Pro! 🎉</h2>
          <p>Your subscription is active. Enjoy all premium features.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal-box {
      background: #13131a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 2rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.75rem;
    }
    .plan-badge {
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1));
      border: 1px solid rgba(99,102,241,0.4);
      color: #a5b4fc;
      padding: 0.4rem 1rem;
      border-radius: 99px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .close-btn {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 0.35rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .close-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

    .loading-state {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      padding: 2rem 0;
      color: rgba(255,255,255,0.5);
      font-size: 0.9rem;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.4);
      margin-bottom: 0.6rem;
    }

    .card-element-wrap {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 14px 16px;
      transition: border-color 0.2s;
      margin-bottom: 1.25rem;
    }
    .card-element-wrap:focus-within {
      border-color: rgba(99,102,241,0.6);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }

    .error-msg {
      display: flex; align-items: center; gap: 0.5rem;
      color: #fca5a5;
      font-size: 0.85rem;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 8px;
      padding: 0.65rem 0.9rem;
      margin-bottom: 1rem;
    }

    .pay-btn {
      width: 100%;
      padding: 0.9rem;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
      margin-bottom: 0.85rem;
    }
    .pay-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99,102,241,0.45);
    }
    .pay-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .secure-note {
      display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      font-size: 0.75rem; color: rgba(255,255,255,0.35);
    }

    .result-state {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 1.5rem 0;
    }
    .result-icon {
      width: 72px; height: 72px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1.25rem;
    }
    .result-icon.success {
      background: rgba(16,185,129,0.15);
      color: #10b981;
      border: 2px solid rgba(16,185,129,0.4);
      animation: popIn 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes popIn {
      from { transform: scale(0.5); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
    h2 { font-size: 1.5rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    p  { color: rgba(255,255,255,0.55); font-size: 0.95rem; }

    .spinner {
      width: 32px; height: 32px;
      border: 3px solid rgba(99,102,241,0.2);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: block;
    }
    .spinner.small { width: 16px; height: 16px; border-width: 2px; border-top-color: #fff; border-color: rgba(255,255,255,0.2); }
    .spinner-wrap { display: inline-flex; align-items: center; gap: 0.5rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class PaymentModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() success = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @ViewChild('cardElement') cardElementRef!: ElementRef<HTMLDivElement>;

  phase: 'loading' | 'form' | 'success' = 'loading';
  isProcessing = false;
  errorMsg = '';

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;
  private clientSecret = '';
  private subscriptionId = '';
  private viewReady = false;
  private dataReady = false;

  constructor(
    private paymentService: PaymentService,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // 1. Create subscription intent on backend
    this.paymentService.createSubscriptionIntent().subscribe({
      next: async (data) => {
        this.clientSecret = data.clientSecret;
        this.subscriptionId = data.subscriptionId;
        // 2. Load Stripe.js
        this.stripe = await loadStripe(env.stripePublicKey);
        this.dataReady = true;
        this.mountCardIfReady();
      },
      error: () => {
        this.ngZone.run(() => {
          this.errorMsg = 'Could not initialize payment. Please try again.';
          this.phase = 'form';
        });
      }
    });
  }

  ngAfterViewInit() {
    this.viewReady = true;
    this.mountCardIfReady();
  }

  private mountCardIfReady() {
    if (!this.viewReady || !this.dataReady || !this.stripe) return;

    this.elements = this.stripe.elements();
    this.cardElement = this.elements.create('card', {
      style: {
        base: {
          color: '#e2e8f0',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '15px',
          fontSmoothing: 'antialiased',
          '::placeholder': { color: 'rgba(148,163,184,0.5)' },
          iconColor: '#818cf8',
        },
        invalid: { color: '#fca5a5', iconColor: '#f87171' },
      },
    });

    this.cardElement.mount(this.cardElementRef.nativeElement);

    this.cardElement.on('change', (event) => {
      this.ngZone.run(() => {
        this.errorMsg = event.error?.message ?? '';
      });
    });

    this.ngZone.run(() => { this.phase = 'form'; });
  }

  async pay() {
    if (!this.stripe || !this.cardElement || this.isProcessing) return;

    this.isProcessing = true;
    this.errorMsg = '';

    const result = await this.stripe.confirmCardPayment(this.clientSecret, {
      payment_method: { card: this.cardElement },
    });

    if (result.error) {
      this.ngZone.run(() => {
        this.errorMsg = result.error!.message ?? 'Payment failed. Please try again.';
        this.isProcessing = false;
      });
      return;
    }

    if (result.paymentIntent?.status === 'succeeded') {
      this.paymentService.activatePremium(this.subscriptionId).subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.phase = 'success';
            setTimeout(() => this.success.emit(), 2000);
          });
        },
        error: () => {
          this.ngZone.run(() => {
            this.errorMsg = 'Payment received but activation failed. Contact support.';
            this.isProcessing = false;
          });
        }
      });
    }
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  ngOnDestroy() {
    this.cardElement?.destroy();
  }
}
