import { Routes } from '@angular/router';
import { AtriumComponent } from './components/atrium/atrium.component';
import { GraftSelectorComponent } from './components/graft-selector/graft-selector.component';
import { HomeComponent } from './pages/home/home.component';
import { ModuleDetailComponent } from './pages/module-detail/module-detail.component';
import { RootSystemsComponent } from './components/root-systems/root-systems.component';

import { AtriumDashboardComponent } from './components/atrium-dashboard/atrium-dashboard.component';

export const routes: Routes = [
  { 
    path: '', 
    component: AtriumComponent,
    children: [
      { path: '', component: AtriumDashboardComponent },
      { path: 'graft-matrix', component: GraftSelectorComponent },
      { path: 'root-systems', component: RootSystemsComponent },
      { path: 'marketplace', component: HomeComponent },
      { path: 'module/:id', component: ModuleDetailComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
