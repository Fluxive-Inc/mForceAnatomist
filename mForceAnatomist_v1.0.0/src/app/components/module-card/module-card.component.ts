import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DissectorModule } from '../../models/module.model';

@Component({
  selector: 'app-module-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss'
})
export class ModuleCardComponent {
  @Input() module!: DissectorModule;

  getIconSvg(type: string): string {
    // Digital Life SVG Paths (Botanical theme)
    switch (type) {
      case 'gcp': // Root Systems
        return `<path d="M12 22V2M12 14c-3-2-6-4-6-8M12 16c3-2 6-4 6-8" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/><circle cx="18" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="2" r="1.5" fill="currentColor"/>`;
      case 'postgres': // Petri Dish
        return `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" fill="none"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/>`;
      case 'flutter': // Seed/Sap Flow
        return `<path d="M12 2C8 6 6 10 6 14a6 6 0 1012 0c0-4-2-8-6-12z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 22V14M12 14c-1.5 2-3 2-3 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
      case 'angular': // Glowing Botanical Specimen (Leaf)
        return `<path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/><path d="M12 2v20M4 7l8 5M20 7l-8 5M4 17l8-5M20 17l-8-5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/>`;
      default:
        return `<path d="M12 2C8 6 6 10 6 14a6 6 0 1012 0c0-4-2-8-6-12z" stroke="currentColor" stroke-width="1.5" fill="none"/>`;
    }
  }
}
