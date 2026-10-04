"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Edit3,
  UserX,
  Palette,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme, THEMES, ThemeKey } from "../context/ThemeContext";

export default function TopHeader() {
  const router = useRouter();
  const { user, openAuthModal, openProfileModal, logout, deleteAccount } = useAuth();
  const { themeKey, setTheme, currentTheme } = useTheme();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const themeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteAccount = async () => {
    setDropdownOpen(false);
    const confirmed = confirm(
      "WARNING: Are you sure you want to permanently delete your Tune-fy account? All your uploaded songs and playlists will be lost forever."
    );
    if (!confirmed) return;

    try {
      await deleteAccount();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete account:", err);
      alert("Failed to delete account. Please try again.");
    }
  };

  const activeName = (user?.displayName || user?.username || "User").trim() || "User";
  const initial = activeName.charAt(0).toUpperCase();

  return (
    <header className="h-16 md:h-20 pt-2 md:pt-4 px-4 md:px-8 flex items-center justify-between z-30 select-none bg-transparent">
      {/* Navigation Arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
          title="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => router.forward()}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-sm"
          title="Go forward"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Right Controls: Theme Picker + Profile / Login */}
      <div className="flex items-center gap-3">
        {/* Theme Color Switcher Button */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemePickerOpen(!themePickerOpen)}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-700/80 hover:border-neutral-500 flex items-center justify-center transition active:scale-95 shadow-sm"
            title="Choose Accent Theme Color"
          >
            <Palette className="w-4 h-4" style={{ color: currentTheme.primary }} />
          </button>

          {themePickerOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#222222] border border-neutral-700 rounded-xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 px-1">
                Accent Color
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
                  const t = THEMES[key];
                  const isSelected = themeKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setTheme(key);
                        setThemePickerOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-white/10 transition group"
                      title={t.label}
                    >
                      <div
                        className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm"
                        style={{ backgroundColor: t.primary }}
                      >
                        {isSelected && (
                          <Check className={`w-3.5 h-3.5 ${key === "white" ? "text-black" : "text-white"}`} />
                        )}
                      </div>
                      <span className="text-[9px] text-neutral-300 font-medium capitalize truncate">
                        {key}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/90 p-1 pr-3 rounded-full border border-neutral-800 transition active:scale-95 shadow-sm"
            >
              <div
                style={{ backgroundColor: currentTheme.primary }}
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={activeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <span className="text-xs font-bold text-white max-w-[120px] truncate pr-1 hidden sm:inline">
                {activeName}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-[#282828] border border-neutral-700 rounded-lg p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    openProfileModal();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 rounded transition text-left"
                >
                  <Edit3 className="w-4 h-4 text-neutral-400" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 rounded transition text-left"
                >
                  <LogOut className="w-4 h-4 text-neutral-400" />
                  <span>Log out</span>
                </button>

                <div className="my-1 border-t border-neutral-700/60" />

                <button
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded transition text-left"
                >
                  <UserX className="w-4 h-4 text-red-400" />
                  <span>Delete Account</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold px-4 py-1.5 rounded-full hover:scale-105 active:scale-95 transition shadow-sm"
          >
            <User className="w-3.5 h-3.5" />
            <span>Log in</span>
          </button>
        )}
      </div>
    </header>
  );
}