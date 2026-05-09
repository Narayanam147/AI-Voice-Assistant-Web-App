export type User = {
  id: string;
  email?: string;
  role?: 'user' | 'premium';
  stripeCustomerId?: string | null;
};

export const UserModel = undefined;
