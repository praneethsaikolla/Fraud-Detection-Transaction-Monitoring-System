import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginRequest, type JwtResponse } from "@/services/api";

const STORAGE_KEY = "fraudguard-auth";

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
};

export type AuthState = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  authState: AuthState | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAuthState(JSON.parse(saved));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    const jwt: JwtResponse = await loginRequest(email, password);
    const state: AuthState = {
      token: jwt.token,
      user: {
        id: jwt.id,
        email: jwt.email,
        firstName: jwt.firstName,
        lastName: jwt.lastName,
        roles: jwt.roles,
      },
    };
    setAuthState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const logout = () => {
    setAuthState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      authState,
      isAuthenticated: Boolean(authState?.token),
      login,
      logout,
    }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
