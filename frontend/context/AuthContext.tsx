"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "@/utils/api";

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  security_question?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isProfileModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    security_question?: string,
    security_answer?: string
  ) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { displayName?: string; username?: string }) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));

          // Confirm user still exists on backend/Supabase
          const res = await api.get("/api/auth/me");
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        } catch (err) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 404) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();

    // Re-verify authentication state when returning to this browser window
    window.addEventListener("focus", checkAuthStatus);
    return () => window.removeEventListener("focus", checkAuthStatus);
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  const login = async (identifier: string, password: string) => {
    const res = await api.post("/api/auth/login", {
      username: identifier,
      password: password,
    });
    const { token: jwtToken, user: userData } = res.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    security_question?: string,
    security_answer?: string
  ) => {
    const res = await api.post("/api/auth/register", {
      username,
      email,
      password,
      security_question,
      security_answer,
    });
    const { token: jwtToken, user: userData } = res.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data: { displayName?: string; username?: string }) => {
    const res = await api.patch("/api/auth/profile", data);
    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));
  };

  const updateAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/api/auth/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.avatarUrl && user) {
      const updatedUser = { ...user, avatarUrl: res.data.avatarUrl };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  const deleteAccount = async () => {
    const activeToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    if (!activeToken) {
      logout();
      return;
    }

    try {
      await api.delete("/api/auth/account");
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      console.warn("Account was already deleted remotely:", status);
    } finally {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthModalOpen,
        isProfileModalOpen,
        openAuthModal,
        closeAuthModal,
        openProfileModal,
        closeProfileModal,
        login,
        register,
        logout,
        updateProfile,
        updateAvatar,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}