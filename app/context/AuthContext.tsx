"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

import type {
  LoginRequest,
  RegisterRequest,
  User,
} from "../lib/types";

import {
  login as loginApi,
  register as registerApi,
  getCurrentUser,
} from "../lib/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const TOKEN_KEY = "austra_auth_token";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps): ReactNode {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        setToken(storedToken);

        const userData = await getCurrentUser();

        setUser(userData);
      } catch (error) {
        console.warn(
          "Failed to restore authentication session:",
          error,
        );

        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [logout]);

  const login = async (
    data: LoginRequest,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const response = await loginApi(data);

      const accessToken = response.access_token;

      localStorage.setItem(TOKEN_KEY, accessToken);

      setToken(accessToken);
      setUser(response.user);
    } catch (error) {
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    data: RegisterRequest,
  ): Promise<void> => {
    setIsLoading(true);

    try {
      await registerApi(data);

      const response = await loginApi({
        email: data.email,
        password: data.password,
      });

      const accessToken = response.access_token;

      localStorage.setItem(TOKEN_KEY, accessToken);

      setToken(accessToken);
      setUser(response.user);
    } catch (error) {
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }

  return context;
}