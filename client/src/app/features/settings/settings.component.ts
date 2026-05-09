import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  userEmail = '';
  userName = '';

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.authService.session$.subscribe(session => {
      if (session?.user) {
        this.userEmail = session.user.email ?? '';
        this.userName = session.user.email?.split('@')[0] ?? 'User';
      }
    });
  }
}
