import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { supabaseClient } from './core/supabase/supabase.client';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        if (this.router.url.includes('auth')) {
          this.router.navigate(['/chat']);
        }
      } else if (event === 'SIGNED_OUT') {
        this.router.navigate(['/auth/login']);
      }
    });

    supabaseClient.auth.getSession().then(({ data }) => {
      if (data.session && this.router.url.includes('auth')) {
        this.router.navigate(['/chat']);
      }
    });
  }
}
