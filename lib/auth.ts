// Authentication utilities

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  // Store in localStorage
  localStorage.setItem('auth_token', token);
  
  // Store timestamp when token was set
  localStorage.setItem('auth_token_timestamp', Date.now().toString());
  
  // Store in cookie for middleware (7 days expiry)
  document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  
  // Clear localStorage
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token_timestamp');
  localStorage.removeItem('user');
  
  // Clear cookie
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;

  // Decode the JWT payload and check the actual exp claim
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      clearAuthToken();
      return false;
    }
    // Base64url decode the payload
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      // JWT has expired
      clearAuthToken();
      return false;
    }
  } catch {
    // If we can't decode the token, fall back to the timestamp check
    const timestamp = localStorage.getItem('auth_token_timestamp');
    if (timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (tokenAge > sevenDays) {
        clearAuthToken();
        return false;
      }
    }
  }

  return true;
}

export function getUser(): any {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch {
    // Ignore parsing errors
  }
  
  return null;
}

export function setUser(user: any): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user', JSON.stringify(user));
}
