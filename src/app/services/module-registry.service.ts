import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { DissectorModule } from '../models/module.model';

@Injectable({
  providedIn: 'root'
})
export class ModuleRegistryService {
  private mockData: DissectorModule[] = [
    {
      id: 'anatomist-core-gcp',
      name: 'Core GCP Dissector',
      version: '1.2.0',
      compatibility: 'mForceArchitect v3+',
      downloadUrl: 'https://registry.fluxive.ai/modules/anatomist-core-gcp-1.2.0.tar.gz',
      author: 'Fluxive OS Team',
      fileSize: '4.2 MB',
      category: 'Cloud Infrastructure',
      description: 'Maps Google Cloud IAM, App Engine, and Cloud Build resources directly into the 3D ecosystem visualizer.',
      capabilities: [
        'Maps Google Cloud IAM Roles and Policies',
        'Visualizes App Engine Services and Versions',
        'Traces Cloud Build Triggers and Executions'
      ],
      dependencies: ['mforce-core-engine >= 2.0.0'],
      iconType: 'gcp'
    },
    {
      id: 'anatomist-db-alloy',
      name: 'AlloyDB & PostgreSQL',
      version: '2.0.1',
      compatibility: 'mForceArchitect v3+',
      downloadUrl: 'https://registry.fluxive.ai/modules/anatomist-db-alloy-2.0.1.tar.gz',
      author: 'Fluxive Data Team',
      fileSize: '1.8 MB',
      category: 'Databases',
      description: 'Advanced schema mapping and query analysis for AlloyDB and PostgreSQL databases.',
      capabilities: [
        'Parses PostgreSQL Schemas and Tables',
        'Maps Foreign Key Relationships in 3D',
        'Analyzes AlloyDB Cluster Topologies'
      ],
      dependencies: ['mforce-core-engine >= 2.0.0', 'mforce-db-tools >= 1.5.0'],
      iconType: 'postgres'
    },
    {
      id: 'anatomist-lang-dart',
      name: 'Flutter & Dart AST',
      version: '3.1.5',
      compatibility: 'mForceArchitect v3+',
      downloadUrl: 'https://registry.fluxive.ai/modules/anatomist-lang-dart-3.1.5.tar.gz',
      author: 'Fluxive Mobile Team',
      fileSize: '5.1 MB',
      category: 'Languages',
      description: 'Deep AST parsing for Flutter and Dart, visualizing widget trees and state management flows.',
      capabilities: [
        'Parses Dart Abstract Syntax Trees (AST)',
        'Maps Flutter Widget Hierarchies',
        'Traces Provider/Riverpod/Bloc State Dependencies'
      ],
      dependencies: ['mforce-core-engine >= 2.1.0'],
      iconType: 'flutter'
    },
    {
      id: 'anatomist-lang-ts',
      name: 'Angular & TypeScript',
      version: '4.0.0',
      compatibility: 'mForceArchitect v3+',
      downloadUrl: 'https://registry.fluxive.ai/modules/anatomist-lang-ts-4.0.0.tar.gz',
      author: 'Fluxive Web Team',
      fileSize: '6.3 MB',
      category: 'Frameworks',
      description: 'Analyzes Angular workspaces, mapping components, services, routing, and interceptors.',
      capabilities: [
        'Maps Angular Routes and Lazy Loaded Modules',
        'Visualizes Component Injection Trees',
        'Traces RxJS Observable Streams'
      ],
      dependencies: ['mforce-core-engine >= 2.2.0'],
      iconType: 'angular'
    }
  ];

  constructor() { }

  getModules(): Observable<DissectorModule[]> {
    return of(this.mockData).pipe(delay(300));
  }

  getModuleById(id: string): Observable<DissectorModule | undefined> {
    const module = this.mockData.find(m => m.id === id);
    return of(module).pipe(delay(200));
  }
}
