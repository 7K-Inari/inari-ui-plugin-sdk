import { createContext, createElement, useContext, type ReactNode } from 'react';

export interface Principal {
  subject: string;
  displayName: string;
  groups: string[];
}

export interface AuthState {
  principal: Principal | null;
  getToken: () => Promise<string | undefined> | string | undefined;
}

export const AuthContext = createContext<AuthState | null>(null);

// Module-level mirror of the active AuthState: remotes are host-provided
// singleton consumers, and their non-component code paths (e.g. instance
// action runners invoked from host menus) cannot call hooks.
let currentAuth: AuthState | null = null;

export function AuthProvider(props: { value: AuthState; children: ReactNode }) {
  currentAuth = props.value;
  return createElement(AuthContext.Provider, { value: props.value }, props.children);
}

/** getAuthState returns the active AuthState outside React (null before the
 * provider mounts). Prefer useAuth() inside components. */
export function getAuthState(): AuthState | null {
  return currentAuth;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function usePrincipal(): Principal | null {
  return useAuth().principal;
}
