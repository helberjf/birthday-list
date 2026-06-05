import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

const TOKEN_KEY = "admin_token";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [, setLocation] = useLocation();

  const login = useCallback((newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setLocation("/admin/dashboard");
  }, [setLocation]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setLocation("/admin/login");
  }, [setLocation]);

  // Sync state if localStorage changes in another tab
  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem(TOKEN_KEY));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    token,
    isAuthenticated: !!token,
    authHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    login,
    logout
  };
}
