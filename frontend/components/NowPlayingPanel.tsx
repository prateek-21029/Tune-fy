"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Heart, Check } from "lucide-react";
import { useAudio } from "../context/AudioContext";

export default function NowPlayingPanel() {
  const { currentTrack, likedTrackIds, toggleLike, isNowPlayingOpen, closeNowPlaying } = useAudio();

  if (!currentTrack || !isNowPlayingOpen) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);

  return (
    <aside className="w-80 h-full bg-[#121212] border-l border-neutral-800 flex flex-col select-none overflow-y-auto p-4 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-white">Now Playing</h3>
        <button
          onClick={closeNowPlaying}
          className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Large Cover Artwork */}
      <div className="w-full aspect-square rounded-xl overflow-hidden bg-neutral-800 shadow-2xl mb-4 flex-shrink-0">
        <img
          src={currentTrack.coverUrl}
          alt={currentTrack.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Title, Artist & Like */}
      <div className="flex items-center justify-between mb-4">
        <div className="overflow-hidden pr-2">
          <h2 className="text-lg font-extrabold text-white truncate" title={currentTrack.title}>
            {currentTrack.title}
          </h2>
          <p className="text-xs text-neutral-400 truncate mt-0.5" title={currentTrack.artist}>
            {currentTrack.artist}
          </p>
        </div>
        <button
          onClick={() => toggleLike(currentTrack.id)}
          className="p-1.5 text-neutral-400 hover:text-white transition flex-shrink-0"
          title={isLiked ? "Unlike" : "Like"}
        >
          <Heart className={`w-5 h-5 ${isLiked ? "fill-[#3b82f6] text-[#3b82f6]" : ""}`} />
        </button>
      </div>

      {/* Notes Section */}
      <NotesCard />
    </aside>
  );
}

function NotesCard() {
  const { currentTrack, updateTrackBio } = useAudio();
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

      await axios.patch(`https://tunefy-backend.onrender.com/api/tracks/${currentTrack.id}`, formData);
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
    <div className="bg-[#242424] p-4 rounded-xl text-white mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Notes
        </span>
        {savedSuccess && (
          <span className="text-[11px] text-[#1db954] font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <textarea
        rows={4}
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Type notes about this song or artist..."
        className="w-full bg-[#181818] text-xs text-neutral-200 p-2.5 rounded-lg border border-neutral-700 focus:border-[#3b82f6] outline-none resize-y min-h-[90px]"
      />

      <button
        onClick={handleSaveNote}
        disabled={isSaving}
        className="w-full mt-2 py-1.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-bold text-xs rounded-full transition disabled:opacity-50"
      >
        {isSaving ? "Saving Note..." : "Save Note"}
      </button>
    </div>
  );
}