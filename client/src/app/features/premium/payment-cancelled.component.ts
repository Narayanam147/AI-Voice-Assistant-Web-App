import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancelled',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="result-page">
      <div class="result-card cancel-card">
        <div class="icon-wrap cancel-icon">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h1>Payment Cancelled</h1>
        <p>No worries — you haven't been charged. You can upgrade to Pro any time from the Premium page.</p>
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
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1.5rem;
    }
    .cancel-icon {
      background: rgba(239, 68, 68, 0.12);
      color: #ef4444;
      border: 2px solid rgba(239, 68, 68, 0.35);
    }
    h1 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #fff;
    }
    p {
      color: rgba(255,255,255,0.6);
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .result-btn {
      display: inline-block;
      padding: 0.85rem 2rem;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      color: white;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }
    .result-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99,102,241,0.4);
    }
  `]
})
export class PaymentCancelledComponent {}
