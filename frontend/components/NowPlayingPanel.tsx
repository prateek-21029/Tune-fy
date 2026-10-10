"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Heart, Check } from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useTheme } from "../context/ThemeContext";

export default function NowPlayingPanel() {
  const {
    currentTrack,
    likedTrackIds,
    toggleLike,
    isNowPlayingOpen,
    closeNowPlaying,
  } = useAudio();
  const { currentTheme } = useTheme();

  if (!currentTrack || !isNowPlayingOpen) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={closeNowPlaying}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <aside className="fixed inset-x-0 bottom-0 top-16 z-50 md:static md:top-auto md:w-80 md:h-full bg-[#121212] border-t md:border-t-0 md:border-l border-neutral-800 rounded-t-2xl md:rounded-none flex flex-col select-none overflow-y-auto p-5 md:p-4 flex-shrink-0 shadow-2xl animate-in slide-in-from-bottom md:animate-none duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-white">Now Playing</h3>
          <button
            onClick={closeNowPlaying}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition active:scale-95"
            title="Close panel"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Cover Artwork */}
        <div className="w-48 h-48 md:w-full md:aspect-square mx-auto rounded-xl overflow-hidden bg-neutral-800 shadow-2xl mb-4 flex-shrink-0 border border-white/5">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title, Artist & Like */}
        <div className="flex items-center justify-between mb-4">
          <div className="overflow-hidden pr-2">
            <h2
              className="text-lg font-extrabold text-white truncate"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h2>
            <p
              className="text-xs text-neutral-400 truncate mt-0.5"
              title={currentTrack.artist}
            >
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="p-1.5 text-neutral-400 hover:text-white transition flex-shrink-0 active:scale-90"
            title={isLiked ? "Unlike" : "Like"}
          >
            <Heart
              className="w-5 h-5"
              style={{
                fill: isLiked ? currentTheme.primary : "none",
                color: isLiked ? currentTheme.primary : "currentColor",
              }}
            />
          </button>
        </div>

        {/* Notes Section */}
        <NotesCard />
      </aside>
    </>
  );
}

function NotesCard() {
  const { currentTrack, updateTrackBio } = useAudio();
  const { currentTheme } = useTheme();
  const [noteText, setNoteText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentTrack) {
      setNoteText(currentTrack.artistBio || "");
      setSavedSuccess(false);
    }
  }, [currentTrack?.id, currentTrack?.artistBio]);

  if (!currentTrack) return null;

  const handleSaveNote = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const formData = new FormData();
      formData.append("artist_bio", noteText.trim());
      await axios.patch(
        `https://tunefy-backend.onrender.com/api/tracks/${currentTrack.id}`,
        formData
      );
      if (updateTrackBio) {
        updateTrackBio(currentTrack.id, noteText.trim());
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#242424] p-4 rounded-xl text-white mt-2 border border-white/5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Notes
        </span>
        {savedSuccess && (
          <span
            style={{ color: currentTheme.primary }}
            className="text-[11px] font-semibold flex items-center gap-1 animate-in fade-in duration-200"
          >
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <textarea
        rows={4}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Type notes about this song or artist..."
        style={{
          borderColor: undefined,
        }}
        className="w-full bg-[#181818] text-xs text-neutral-200 p-2.5 rounded-lg border border-neutral-700 focus:border-white/40 outline-none resize-y min-h-[90px] transition"
      />

      <button
        onClick={handleSaveNote}
        disabled={isSaving}
        style={{
          backgroundColor: currentTheme.primary,
        }}
        className="w-full mt-2 py-2 text-black font-extrabold text-xs rounded-full hover:opacity-90 active:scale-95 transition disabled:opacity-50 shadow-md"
      >
        {isSaving ? "Saving Note..." : "Save Note"}
      </button>
    </div>
  );
}