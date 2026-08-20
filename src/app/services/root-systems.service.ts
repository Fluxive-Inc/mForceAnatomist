import { Injectable } from '@angular/core';

export interface DissectorModule {
  name: string;
  description: string;
}

export interface RootSystem {
  id: string;
  name: string;
  overview: string;
  devicon: string;
  modules: DissectorModule[];
}

export interface BotanicalCategory {
  id: string;
  name: string;
  metaphor: string;
  systems: RootSystem[];
}

@Injectable({
  providedIn: 'root'
})
export class RootSystemsService {

  private taxonomy: BotanicalCategory[] = [
    {
      id: 'web',
      name: 'The Web Atrium',
      metaphor: 'Surface Roots / DOM Interfaces',
      systems: [
        {
          id: 'angular', name: 'Angular', devicon: 'devicon-angularjs-plain',
          overview: 'Structural, component-based TypeScript framework.',
          modules: [{ name: 'v21.x-Dissector', description: 'Zoneless architecture' }]
        },
        {
          id: 'react', name: 'React', devicon: 'devicon-react-original',
          overview: 'Functional, state-driven virtual DOM library.',
          modules: [{ name: 'v18.x-Dissector', description: 'Concurrent mode' }]
        },
        {
          id: 'vue', name: 'Vue.js', devicon: 'devicon-vuejs-plain',
          overview: 'Reactive, progressively adoptable framework.',
          modules: [{ name: 'v3.x-Dissector', description: 'Composition API' }]
        },
        {
          id: 'svelte', name: 'Svelte', devicon: 'devicon-svelte-plain',
          overview: 'Compile-time UI framework.',
          modules: [{ name: 'v4.x-Dissector', description: 'Compiler-driven reactivity' }]
        }
      ]
    },
    {
      id: 'mobile',
      name: 'The Mobile Conservatory',
      metaphor: 'Canopy Roots / Native Platforms',
      systems: [
        {
          id: 'flutter', name: 'Flutter', devicon: 'devicon-flutter-plain',
          overview: 'Canvas-rendered UI toolkit.',
          modules: [{ name: 'v3.29-Dissector', description: 'Widget tree extraction' }]
        },
        {
          id: 'react-native', name: 'React Native', devicon: 'devicon-react-original',
          overview: 'Bridge-based native rendering.',
          modules: [{ name: 'v0.7x-Dissector', description: 'Fabric architecture mapping' }]
        },
        {
          id: 'swift', name: 'SwiftUI (iOS)', devicon: 'devicon-swift-plain',
          overview: 'Native iOS declarative UI.',
          modules: [{ name: 'SwiftUI-Dissector', description: 'Declarative view structures' }]
        },
        {
          id: 'kotlin', name: 'Kotlin (Android)', devicon: 'devicon-kotlin-plain',
          overview: 'Native Android declarative UI.',
          modules: [{ name: 'Compose-Dissector', description: 'Composable function mapping' }]
        }
      ]
    },
    {
      id: 'desktop',
      name: 'The OS Terrarium',
      metaphor: 'Deep Roots / Operating Systems',
      systems: [
        {
          id: 'macos', name: 'macOS', devicon: 'devicon-apple-original',
          overview: 'Darwin-based POSIX operating system.',
          modules: [{ name: 'Cocoa-Dissector', description: 'AppKit mappings' }]
        },
        {
          id: 'windows', name: 'Windows', devicon: 'devicon-windows8-original',
          overview: 'NT-based operating system.',
          modules: [{ name: 'Win32-Dissector', description: 'Native API mappings' }]
        },
        {
          id: 'linux', name: 'Linux', devicon: 'devicon-linux-plain',
          overview: 'Open-source Unix-like kernel.',
          modules: [{ name: 'ELF-Dissector', description: 'Binary architecture mapping' }]
        }
      ]
    },
    {
      id: 'backend',
      name: 'The Core Logic Trunk',
      metaphor: 'Xylem Systems / API Servers',
      systems: [
        {
          id: 'node', name: 'Node.js', devicon: 'devicon-nodejs-plain',
          overview: 'Asynchronous event-driven runtime.',
          modules: [{ name: 'NestJS-Dissector', description: 'Controller mapping' }]
        },
        {
          id: 'python', name: 'Python', devicon: 'devicon-python-plain',
          overview: 'High-performance scripting.',
          modules: [{ name: 'FastAPI-Dissector', description: 'Route parsing' }]
        },
        {
          id: 'java', name: 'Java', devicon: 'devicon-java-plain',
          overview: 'Robust JVM-based enterprise framework.',
          modules: [{ name: 'Spring-Boot-Dissector', description: 'Annotation mapping' }]
        },
        {
          id: 'rust', name: 'Rust', devicon: 'devicon-rust-original',
          overview: 'Memory-safe systems language.',
          modules: [{ name: 'Axum-Dissector', description: 'Macro parsing' }]
        }
      ]
    },
    {
      id: 'db',
      name: 'The Subterranean Vaults',
      metaphor: 'Taproots / Data Stores',
      systems: [
        {
          id: 'postgres', name: 'PostgreSQL', devicon: 'devicon-postgresql-plain',
          overview: 'Relational data architecture.',
          modules: [{ name: 'Schema-Dissector', description: 'Table extraction' }]
        },
        {
          id: 'mongodb', name: 'MongoDB', devicon: 'devicon-mongodb-plain',
          overview: 'Document-oriented schema.',
          modules: [{ name: 'Document-Dissector', description: 'Collection mapping' }]
        },
        {
          id: 'neo4j', name: 'Neo4j', devicon: 'devicon-neo4j-plain',
          overview: 'Graph database.',
          modules: [{ name: 'Cypher-Dissector', description: 'Edge query analysis' }]
        },
        {
          id: 'redis', name: 'Redis', devicon: 'devicon-redis-plain',
          overview: 'In-memory caching store.',
          modules: [{ name: 'Cache-Dissector', description: 'Pub/sub analysis' }]
        }
      ]
    },
    {
      id: 'ledger',
      name: 'The Consensus Ledgers',
      metaphor: 'Mycelial Networks / Blockchain',
      systems: [
        {
          id: 'ethereum', name: 'Ethereum', devicon: 'devicon-solidity-plain',
          overview: 'Decentralized smart contract ledger.',
          modules: [{ name: 'EVM-Dissector', description: 'Bytecode analysis' }]
        },
        {
          id: 'solana', name: 'Solana', devicon: 'devicon-rust-original',
          overview: 'High-throughput parallel ledger.',
          modules: [{ name: 'Sealevel-Dissector', description: 'Program extraction' }]
        }
      ]
    }
  ];

  getTaxonomy(): BotanicalCategory[] {
    return this.taxonomy;
  }

  getRootSystem(id: string): RootSystem | undefined {
    for (const category of this.taxonomy) {
      const system = category.systems.find(s => s.id === id);
      if (system) return system;
    }
    return undefined;
  }

  constructor() { }
}
