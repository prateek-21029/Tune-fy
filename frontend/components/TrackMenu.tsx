"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  Edit2,
  X,
  Camera,
} from "lucide-react";

interface PlaylistSummary {
  id: number;
  name: string;
}

interface TrackMenuProps {
  trackId: string;
  trackTitle: string;
  trackArtist?: string;
  trackCoverUrl?: string;
  onTrackUpdated?: () => void;
  onTrackDeleted?: () => void;
}

export default function TrackMenu({
  trackId,
  trackTitle,
  trackArtist = "",
  trackCoverUrl = "",
  onTrackUpdated,
  onTrackDeleted,
}: TrackMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPlaylistsSubmenu, setShowPlaylistsSubmenu] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [addedPlaylistId, setAddedPlaylistId] = useState<number | null>(null);

  // Position alignment state: 'left' | 'right'
  const [horizontalAlign, setHorizontalAlign] = useState<"left" | "right">("right");

  // Edit Modal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(trackTitle);
  const [editArtist, setEditArtist] = useState(trackArtist);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [previewCover, setPreviewCover] = useState<string>(trackCoverUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchPlaylists = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get("http://localhost:8000/api/playlists", { headers });
      setPlaylists(res.data);
    } catch {
      setPlaylists([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
      // Calculate boundary position
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const MENU_WIDTH = 200;
        const SUBMENU_WIDTH = 200;
        const TOTAL_WIDTH_NEEDED = MENU_WIDTH + SUBMENU_WIDTH;

        // If too close to right edge (or NowPlayingPanel), align to the left
        if (screenWidth - rect.right < TOTAL_WIDTH_NEEDED) {
          setHorizontalAlign("right");
        } 
        // If too close to left sidebar, align to the right
        else if (rect.left < TOTAL_WIDTH_NEEDED) {
          setHorizontalAlign("left");
        } else {
          setHorizontalAlign("right");
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    setEditTitle(trackTitle);
    setEditArtist(trackArtist);
    setPreviewCover(trackCoverUrl);
  }, [trackTitle, trackArtist, trackCoverUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowPlaylistsSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddToPlaylist = async (playlistId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(
        `http://localhost:8000/api/playlists/${playlistId}/tracks/${trackId}`,
        {},
        { headers }
      );
      setAddedPlaylistId(playlistId);
      setTimeout(() => {
        setAddedPlaylistId(null);
        setIsOpen(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to add track to playlist:", err);
    }
  };

  const handleDeleteTrack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete "${trackTitle}"?`)) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`http://localhost:8000/api/tracks/${trackId}`, { headers });
      setIsOpen(false);
      if (onTrackDeleted) onTrackDeleted();
    } catch (err) {
      console.error("Failed to delete track:", err);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCoverFile(file);
      setPreviewCover(URL.createObjectURL(file));
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editArtist.trim()) {
      setErrorMessage("Title and Artist cannot be blank.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("title", editTitle.trim());
    formData.append("artist", editArtist.trim());
    if (editCoverFile) {
      formData.append("cover", editCoverFile);
    }

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers = {
        "Content-Type": "multipart/form-data",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await axios.patch(`http://localhost:8000/api/tracks/${trackId}`, formData, { headers });
      setIsEditOpen(false);
      setIsOpen(false);
      if (onTrackUpdated) onTrackUpdated();
    } catch (err) {
      setErrorMessage("Failed to update track details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 text-neutral-400 hover:text-white transition"
        title="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* 3-Dots Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute bottom-6 w-48 bg-[#282828] border border-neutral-700/80 rounded-lg py-1 shadow-2xl z-50 select-none ${
            horizontalAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          {/* Edit Song Option */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setIsEditOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 hover:text-white transition text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-neutral-300" />
            <span>Edit details</span>
          </button>

          {/* Add to Playlist Submenu */}
          <div
            className="relative"
            onMouseEnter={() => setShowPlaylistsSubmenu(true)}
            onMouseLeave={() => setShowPlaylistsSubmenu(false)}
          >
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Add to playlist</span>
              </div>
              {horizontalAlign === "left" ? (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </button>

            {showPlaylistsSubmenu && (
              <div
                className={`absolute bottom-0 w-48 bg-[#282828] border border-neutral-700/80 rounded-lg py-1 shadow-2xl max-h-56 overflow-y-auto z-50 ${
                  horizontalAlign === "left"
                    ? "left-full ml-1"
                    : "right-full mr-1"
                }`}
              >
                {playlists.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-neutral-400">
                    No playlists created yet
                  </div>
                ) : (
                  playlists.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={(e) => handleAddToPlaylist(pl.id, e)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition truncate text-left"
                    >
                      <span className="truncate">{pl.name}</span>
                      {addedPlaylistId === pl.id && (
                        <Check className="w-3.5 h-3.5 text-[#1db954] flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Delete Track */}
          <button
            onClick={handleDeleteTrack}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-neutral-700 transition text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete from library</span>
          </button>
        </div>
      )}

      {/* Edit Track Modal */}
      {isEditOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <div className="bg-[#282828] border border-neutral-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-white">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-700 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold mb-4">Edit Track Details</h3>

            {errorMessage && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
              />

              {/* Cover Preview & Change */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-md overflow-hidden bg-neutral-800 border border-neutral-700 group cursor-pointer flex-shrink-0"
                >
                  <img
                    src={previewCover}
                    alt={editTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-[10px] font-semibold text-white">Change</span>
                  </div>
                </div>
                <div className="text-xs text-neutral-400">
                  <p className="font-semibold text-white">Cover Artwork</p>
                  <p className="text-[11px] mt-0.5">Click preview image to upload a new cover.</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#181818] text-white text-xs px-3 py-2.5 rounded-md border border-neutral-700 focus:border-[#1db954] outline-none"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                  Artist
                </label>
                <input
                  type="text"
                  required
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="w-full bg-[#181818] text-white text-xs px-3 py-2.5 rounded-md border border-neutral-700 focus:border-[#1db954] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-full text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black rounded-full text-xs font-extrabold flex items-center justify-center disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}