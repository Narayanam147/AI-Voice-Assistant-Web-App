import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-premium',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './premium.component.html',
  styleUrl: './premium.component.scss'
})
export class PremiumComponent {
  isAnnual: boolean = false;
}
