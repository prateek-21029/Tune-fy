"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../utils/api";

export interface User {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
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
    securityQuestion?: string,
    securityAnswer?: string
  ) => Promise<void>;
  logout: () => void;
  deleteAccount: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

// 1. Auto-verify token on startup, tab focus, and page visibility
useEffect(() => {
  const checkAuthStatus = async () => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));

        // Ping backend to confirm user still exists in database
        const res = await api.get("/api/auth/me");
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      } catch (err: any) {
        // Account was deleted on another device or token expired -> instant clean logout
        if (err?.response?.status === 401 || err?.response?.status === 404) {
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

  // Listen for window focus: when you switch from your phone back to your laptop
  window.addEventListener("focus", checkAuthStatus);
  return () => window.removeEventListener("focus", checkAuthStatus);
}, []);

// 2. Graceful deleteAccount: wipes local session even if already deleted on another device
const deleteAccount = async () => {
  const activeToken =
    token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  if (!activeToken) {
    logout();
    return;
  }

  try {
    await api.delete("/api/auth/account");
  } catch (err: any) {
    // If phone already deleted it (401 or 404), do not throw an alert!
    console.warn("Account was already deleted remotely:", err?.response?.status);
  } finally {
    logout();
  }
};

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
    securityQuestion?: string,
    securityAnswer?: string
  ) => {
    const res = await api.post("/api/auth/register", {
      username,
      email,
      password,
      security_question: securityQuestion,
      security_answer: securityAnswer,
    });
    const { token: jwtToken, user: userData } = res.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

const deleteAccount = async () => {
  const activeToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  if (!activeToken) {
    logout();
    return;
  }
  try {
    await api.delete("/api/auth/account");
  } catch (err: any) {
    console.warn("Account delete response:", err?.response?.status);
  } finally {
    logout();
  }
};

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
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
        deleteAccount,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAudioContextHook() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside an AuthProvider");
  return context;
}