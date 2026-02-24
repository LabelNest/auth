export type Product = 'AnnoNest' | 'NestLens' | 'NestResolve';

export type AuthAction = 'recovery' | 'signup' | 'invite' | 'magiclink' | 'unknown';

export interface AuthState {
  app?: Product;
  type: AuthAction;
  error?: 'expired' | 'invalid' | 'none';
}
