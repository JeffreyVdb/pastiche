export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  request_count: number;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}
