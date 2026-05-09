import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

@Component({
  selector: 'app-waveform-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waveform-visualizer.component.html',
  styleUrl: './waveform-visualizer.component.scss'
})
export class WaveformVisualizerComponent {
  @Input() isListening = false;
  @HostBinding('attr.data-listening') get listening() {
    return this.isListening;
  }
  bars = Array.from({ length: 12 }, (_, index) => index);
}
