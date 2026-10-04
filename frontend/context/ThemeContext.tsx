"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeKey = "green" | "blue" | "orange" | "red" | "white" | "pink";

export interface ThemeConfig {
  key: ThemeKey;
  label: string;
  primary: string;       // Main accent (e.g. #3b82f6)
  hover: string;         // Hover state
  textAccent: string;    // Contrast text if needed
  gradientFrom: string;  // Scrubber/Banner start
  gradientTo: string;    // Scrubber/Banner end
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  green: {
    key: "green",
    label: "Spotify Green",
    primary: "#1db954",
    hover: "#1ed760",
    textAccent: "#1db954",
    gradientFrom: "#1db954",
    gradientTo: "#0f5a28",
  },
  blue: {
    key: "blue",
    label: "Electric Blue",
    primary: "#3b82f6",
    hover: "#60a5fa",
    textAccent: "#3b82f6",
    gradientFrom: "#3b82f6",
    gradientTo: "#1e3a8a",
  },
  orange: {
    key: "orange",
    label: "Neon Orange",
    primary: "#f97316",
    hover: "#fb923c",
    textAccent: "#f97316",
    gradientFrom: "#f97316",
    gradientTo: "#7c2d12",
  },
  red: {
    key: "red",
    label: "Vibrant Red",
    primary: "#ef4444",
    hover: "#f87171",
    textAccent: "#ef4444",
    gradientFrom: "#ef4444",
    gradientTo: "#7f1d1d",
  },
  white: {
    key: "white",
    label: "Minimal White",
    primary: "#ffffff",
    hover: "#e5e5e5",
    textAccent: "#ffffff",
    gradientFrom: "#ffffff",
    gradientTo: "#525252",
  },
  pink: {
    key: "pink",
    label: "Hot Pink",
    primary: "#ec4899",
    hover: "#f472b6",
    textAccent: "#ec4899",
    gradientFrom: "#ec4899",
    gradientTo: "#831843",
  },
};

interface ThemeContextType {
  themeKey: ThemeKey;
  currentTheme: ThemeConfig;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>("blue");

  useEffect(() => {
    const saved = localStorage.getItem("tunefy_theme") as ThemeKey;
    if (saved && THEMES[saved]) {
      setThemeKey(saved);
    }
  }, []);

  const setTheme = (key: ThemeKey) => {
    setThemeKey(key);
    try {
      localStorage.setItem("tunefy_theme", key);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        themeKey,
        currentTheme: THEMES[themeKey],
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}