"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "axios";
import {
  Home,
  Search,
  Library,
  Plus,
  Heart,
  Music2,
  Trash2,
  FolderHeart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface PlaylistSummary {
  id: number;
  name: string;
  coverUrl?: string | null;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { user, token, openAuthModal } = useAuth() as any;
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const getAuthHeaders = useCallback(() => {
    const activeToken =
      token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  }, [token]);

  const fetchPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([]);
      return;
    }
    try {
      const res = await axios.get("http://localhost:8000/api/playlists", {
        headers: getAuthHeaders(),
      });
      setPlaylists(res.data);
    } catch {
      setPlaylists([]);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists, pathname]);

  const handlePlusClick = () => {
    if (!user) {
      if (typeof openAuthModal === "function") {
        openAuthModal();
        return;
      }
    }
    setIsCreating(!isCreating);
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const res = await axios.post(
        "http://localhost:8000/api/playlists",
        { name: newPlaylistName.trim() },
        { headers: getAuthHeaders() }
      );
      setNewPlaylistName("");
      setIsCreating(false);
      fetchPlaylists();
      router.push(`/playlist/${res.data.id}`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  };

  const handleDeletePlaylist = async (
    id: number,
    name: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete playlist "${name}"?`)) return;
    try {
      await axios.delete(`http://localhost:8000/api/playlists/${id}`, {
        headers: getAuthHeaders(),
      });
      fetchPlaylists();
      if (pathname === `/playlist/${id}`) {
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  return (
    <aside className="hidden md:flex w-64 bg-black flex-col gap-2 p-2 select-none h-full flex-shrink-0">
      {/* Navigation Block */}
      <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
        <button
          onClick={() => router.push("/")}
          style={pathname === "/" ? { color: currentTheme.primary } : undefined}
          className={`flex items-center gap-4 text-sm font-bold transition ${
            pathname === "/" ? "" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Home className="w-6 h-6" />
          <span>Home</span>
        </button>

        <button
          onClick={() => router.push("/search")}
          style={pathname === "/search" ? { color: currentTheme.primary } : undefined}
          className={`flex items-center gap-4 text-sm font-bold transition ${
            pathname === "/search" ? "" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Search className="w-6 h-6" />
          <span>Search</span>
        </button>
      </div>

      {/* Library Block */}
      <div className="bg-[#121212] rounded-lg p-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-2 py-1 mb-2 text-neutral-400">
          <div className="flex items-center gap-2 hover:text-white cursor-pointer transition">
            <Library className="w-6 h-6" />
            <span className="text-sm font-bold">Your Library</span>
          </div>
          <button
            onClick={handlePlusClick}
            style={{ color: currentTheme.primary }}
            className="p-1 hover:opacity-80 rounded-full transition"
            title="Create Playlist"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Create playlist quick input */}
        {isCreating && (
          <form onSubmit={handleCreatePlaylist} className="px-2 mb-3">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              className="w-full bg-[#242424] text-white text-xs px-3 py-1.5 rounded-md border border-neutral-700 outline-none transition focus:border-white/40"
            />
          </form>
        )}

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {/* Liked Songs */}
          <div
            onClick={() => {
              if (!user) {
                if (typeof openAuthModal === "function") openAuthModal();
                return;
              }
              router.push("/playlist/liked");
            }}
            className={`flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition group ${
              pathname === "/playlist/liked" ? "bg-white/10" : ""
            }`}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #450af5)`,
              }}
              className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 shadow-md"
            >
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="overflow-hidden">
              <p
                style={
                  pathname === "/playlist/liked"
                    ? { color: currentTheme.primary }
                    : undefined
                }
                className="text-sm font-bold text-white truncate"
              >
                Liked Songs
              </p>
              <p className="text-xs text-neutral-400">Collection • Auto</p>
            </div>
          </div>

          {/* Uploaded Songs */}
          {user && (
            <div
              onClick={() => router.push("/playlist/uploads")}
              className={`flex items-center gap-3 p-2 rounded-md hover:bg-white/10 cursor-pointer transition group ${
                pathname === "/playlist/uploads" ? "bg-white/10" : ""
              }`}
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #107c41)`,
                }}
                className="w-12 h-12 rounded flex items-center justify-center flex-shrink-0 shadow-md"
              >
                <FolderHeart className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <p
                  style={
                    pathname === "/playlist/uploads"
                      ? { color: currentTheme.primary }
                      : undefined
                  }
                  className="text-sm font-bold text-white truncate"
                >
                  Uploaded Songs
                </p>
                <p className="text-xs text-neutral-400">Your Personal Tracks</p>
              </div>
            </div>
          )}

          {/* User Playlists */}
          {playlists.map((pl) => {
            const isActive = pathname === `/playlist/${pl.id}`;
            return (
              <div
                key={pl.id}
                onClick={() => router.push(`/playlist/${pl.id}`)}
                className={`flex items-center justify-between p-2 rounded-md hover:bg-white/10 cursor-pointer transition group ${
                  isActive ? "bg-white/10" : ""
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {pl.coverUrl ? (
                      <img
                        src={pl.coverUrl}
                        alt={pl.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="w-6 h-6 text-neutral-500" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p
                      style={isActive ? { color: currentTheme.primary } : undefined}
                      className={`text-sm font-bold truncate ${
                        isActive ? "" : "text-white"
                      }`}
                    >
                      {pl.name}
                    </p>
                    <p className="text-xs text-neutral-400">Playlist</p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeletePlaylist(pl.id, pl.name, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}