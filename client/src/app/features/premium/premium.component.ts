import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PaymentService, SubscriptionStatus } from '../../core/services/payment.service';
import { PaymentModalComponent } from './payment-modal.component';

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [FormsModule, CommonModule, PaymentModalComponent],
  templateUrl: './premium.component.html',
  styleUrl: './premium.component.scss'
})
export class PremiumComponent implements OnInit {
  isAnnual: boolean = false;
  errorMessage: string = '';
  status: SubscriptionStatus | null = null;
  showPaymentModal = false;

  constructor(
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.paymentService.getSubscriptionStatus().subscribe({
      next: (s) => (this.status = s),
      error: () => (this.status = null)
    });
  }

  get isPremium(): boolean {
    return this.status?.role === 'premium' || this.status?.role === 'admin';
  }

  openPaymentModal(): void {
    if (this.isPremium) return;
    this.errorMessage = '';
    this.showPaymentModal = true;
  }

  onPaymentSuccess(): void {
    this.showPaymentModal = false;
    // Refresh subscription status
    this.paymentService.getSubscriptionStatus().subscribe({
      next: (s) => {
        this.status = s;
        this.router.navigate(['/dashboard']);
      }
    });
  }

  onModalClose(): void {
    this.showPaymentModal = false;
  }
}
