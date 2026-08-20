import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModuleRegistryService } from '../../services/module-registry.service';
import { DissectorModule } from '../../models/module.model';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { HeaderComponent } from '../../components/header/header.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ModuleCardComponent, HeaderComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  modules$: Observable<DissectorModule[]> | null = null;
  categories = ['All', 'Languages', 'Databases', 'Cloud Infrastructure', 'Frameworks'];
  activeCategory = 'All';

  constructor(private registry: ModuleRegistryService) {}

  ngOnInit() {
    this.modules$ = this.registry.getModules();
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
  }
}
