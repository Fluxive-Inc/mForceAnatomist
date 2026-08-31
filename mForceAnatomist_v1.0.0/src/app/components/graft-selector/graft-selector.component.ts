import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-graft-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './graft-selector.component.html',
  styleUrl: './graft-selector.component.scss'
})
export class GraftSelectorComponent {
  categories = [
    {
      id: 'web',
      name: 'Web Ecosystems',
      frameworks: [
        { id: 'angular', name: 'Angular', icon: 'A' },
        { id: 'react', name: 'React', icon: 'R' },
        { id: 'vue', name: 'Vue', icon: 'V' }
      ]
    },
    {
      id: 'app',
      name: 'App Grafts',
      frameworks: [
        { id: 'flutter', name: 'Flutter', icon: 'F' },
        { id: 'react_native', name: 'React Native', icon: 'RN' },
        { id: 'swift', name: 'SwiftUI', icon: 'S' }
      ]
    },
    {
      id: 'db',
      name: 'Database Grafts',
      frameworks: [
        { id: 'postgresql', name: 'PostgreSQL', icon: 'PG' },
        { id: 'alloydb', name: 'AlloyDB', icon: 'AL' },
        { id: 'mongodb', name: 'MongoDB', icon: 'M' }
      ]
    }
  ];

  selectedSoil: string | null = 'angular';
  selectedGraft: string | null = 'flutter';

  selectSoil(id: string) {
    this.selectedSoil = id;
  }

  selectGraft(id: string) {
    this.selectedGraft = id;
  }
}
