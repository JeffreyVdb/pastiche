export interface SnippetListItem {
  id: string;
  user_id: string;
  title: string;
  language: string;
  content_size: number;
  created_at: string;
  updated_at: string;
}

export interface Snippet {
  id: string;
  user_id: string;
  title: string;
  language: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface SnippetCreate {
  title: string;
  language: string;
  content: string;
}

export interface SnippetUpdate {
  title?: string;
  language?: string;
  content?: string;
}
