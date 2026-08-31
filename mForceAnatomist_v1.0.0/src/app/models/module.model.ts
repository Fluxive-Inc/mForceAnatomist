export interface DissectorModule {
  id: string;
  name: string;
  version: string;
  compatibility: string;
  downloadUrl: string;
  author: string;
  fileSize: string;
  category: 'Cloud Infrastructure' | 'Databases' | 'Languages' | 'Frameworks';
  description: string;
  capabilities: string[];
  dependencies: string[];
  iconType: string;
}
