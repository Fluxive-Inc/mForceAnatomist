import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ModuleRegistryService } from '../../services/module-registry.service';
import { DissectorModule } from '../../models/module.model';
import { HeaderComponent } from '../../components/header/header.component';
import { Observable, switchMap } from 'rxjs';

@Component({
  selector: 'app-module-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './module-detail.component.html',
  styleUrl: './module-detail.component.scss'
})
export class ModuleDetailComponent implements OnInit {
  module$: Observable<DissectorModule | undefined> | null = null;
  copied = false;

  constructor(
    private route: ActivatedRoute,
    private registry: ModuleRegistryService
  ) {}

  ngOnInit() {
    this.module$ = this.route.paramMap.pipe(
      switchMap(params => this.registry.getModuleById(params.get('id') || ''))
    );
  }

  copyCommand(id: string) {
    const cmd = `mforce install ${id}`;
    navigator.clipboard.writeText(cmd).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }
}
