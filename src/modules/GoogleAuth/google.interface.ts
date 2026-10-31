export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  idToken?: string | null;
  expiryDate?: number | null;
}

export interface GoogleLoginResult {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  safeData: Record<string, unknown> | null;
  isNewUser: boolean;
  returnUrl?: string;
}

export interface StoredOAuthState {
  codeVerifier: string;
  returnUrl?: string;
  createdAt: number;
}
