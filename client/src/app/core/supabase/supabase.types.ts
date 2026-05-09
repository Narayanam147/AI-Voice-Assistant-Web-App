export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
  };
};
