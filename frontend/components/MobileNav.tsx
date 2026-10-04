"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Search, Heart, FolderHeart } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { user, openAuthModal } = useAuth() as any;

  const navItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Search", path: "/search", icon: Search },
    {
      label: "Liked",
      path: "/playlist/liked",
      icon: Heart,
      requiresAuth: true,
    },
    {
      label: "Uploads",
      path: "/playlist/uploads",
      icon: FolderHeart,
      requiresAuth: true,
    },
  ];

  const handleNav = (item: typeof navItems[0]) => {
    if (item.requiresAuth && !user) {
      if (typeof openAuthModal === "function") openAuthModal();
      return;
    }
    router.push(item.path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-black/95 backdrop-blur-md border-t border-neutral-800 flex items-center justify-around z-40 select-none px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() => handleNav(item)}
            className="flex flex-col items-center justify-center flex-1 py-1 gap-0.5 text-neutral-400 hover:text-white transition active:scale-95"
          >
            <Icon
              className="w-5 h-5 transition-transform"
              style={{
                color: isActive ? currentTheme.primary : "currentColor",
                fill: isActive && item.label === "Liked" ? currentTheme.primary : "none",
              }}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: isActive ? currentTheme.primary : "inherit" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}