import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ChatComponent } from './features/chat/chat.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { PremiumComponent } from './features/premium/premium.component';
import { PaymentSuccessComponent } from './features/premium/payment-success.component';
import { PaymentCancelledComponent } from './features/premium/payment-cancelled.component';
import { SettingsComponent } from './features/settings/settings.component';
import { HistoryComponent } from './features/history/history.component';
import { AppShellComponent } from './shared/layouts/app-shell/app-shell.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ],
  },
  // Stripe return URLs — public, no auth guard needed
  { path: 'payment-success', component: PaymentSuccessComponent },
  { path: 'payment-cancelled', component: PaymentCancelledComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'premium', component: PremiumComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'history', component: HistoryComponent },
    ],
  },
  { path: '**', redirectTo: 'auth/login' },
];
