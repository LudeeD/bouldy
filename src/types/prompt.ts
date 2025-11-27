export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category?: string;
  variables: string[];
  lastUsed?: number;
  useCount: number;
  created: number;
  modified: number;
  path: string;
}

export interface PromptMetadata {
  title: string;
  content: string;
  tags: string[];
  category?: string;
  variables: string[];
  lastUsed?: number;
  useCount: number;
}
