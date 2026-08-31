import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RootSystemsService, BotanicalCategory, RootSystem } from '../../services/root-systems.service';

@Component({
  selector: 'app-root-systems',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './root-systems.component.html',
  styleUrl: './root-systems.component.scss'
})
export class RootSystemsComponent implements OnInit {
  private rootSystemService = inject(RootSystemsService);
  
  taxonomy: BotanicalCategory[] = [];
  selectedSystem: RootSystem | null = null;
  expandedCategory: string | null = 'web';

  ngOnInit(): void {
    this.taxonomy = this.rootSystemService.getTaxonomy();
    if (this.taxonomy.length > 0 && this.taxonomy[0].systems.length > 0) {
      this.selectedSystem = this.taxonomy[0].systems[0];
    }
  }

  toggleCategory(id: string) {
    if (this.expandedCategory === id) {
      this.expandedCategory = null;
    } else {
      this.expandedCategory = id;
    }
  }

  selectSystem(system: RootSystem) {
    this.selectedSystem = system;
  }
}
