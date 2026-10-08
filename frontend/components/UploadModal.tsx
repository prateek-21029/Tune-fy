"use client";

import React, { useState } from "react";
import api from "../utils/api";
import { X, UploadCloud, Sparkles, Image as ImageIcon, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const { user, token, openAuthModal } = useAuth() as any;
  const { currentTheme } = useTheme();

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fetchedCoverUrl, setFetchedCoverUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [detectedDuration, setDetectedDuration] = useState<number>(210);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  if (!isOpen) return null;

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(cleanName);

      // Measure accurate client-side audio duration in seconds
      const tempAudio = new Audio();
      tempAudio.src = URL.createObjectURL(file);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDetectedDuration(Math.round(tempAudio.duration));
        }
        URL.revokeObjectURL(tempAudio.src);
      };
    }
  };

  const handleFetchMetadata = async () => {
    if (!title.trim()) return;
    setIsSearching(true);
    setErrorMsg("");
    try {
      const res = await api.get("/api/spotify/search", {
  params: { q: title.trim() },
});
      if (res.data.title) setTitle(res.data.title);
      if (res.data.artist) setArtist(res.data.artist);
      if (res.data.coverUrl) {
        setFetchedCoverUrl(res.data.coverUrl);
        setCoverFile(null);
      }
    } catch {
      // Non-blocking fallback
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setFetchedCoverUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenLogin = () => {
    onClose();
    if (typeof openAuthModal === "function") {
      openAuthModal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!audioFile) {
      setErrorMsg("Please select an audio file.");
      return;
    }
    if (!title.trim() || !artist.trim()) {
      setErrorMsg("Title and Artist are required.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("artist", artist.trim());
    formData.append("audio", audioFile);
    formData.append("duration", detectedDuration.toString());

    if (coverFile) {
      formData.append("cover", coverFile);
    } else if (fetchedCoverUrl) {
      formData.append("cover_url_str", fetchedCoverUrl);
    }

    try {
      const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
      const headers: Record<string, string> = {
        "Content-Type": "multipart/form-data",
      };
      if (activeToken) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }

      await api.post("/api/tracks/upload", formData, { headers });
      onUploadSuccess();
      onClose();
      setAudioFile(null);
      setCoverFile(null);
      setFetchedCoverUrl(null);
      setTitle("");
      setArtist("");
      setShowLoginPrompt(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setShowLoginPrompt(true);
      } else {
        const detail = err.response?.data?.detail;
        setErrorMsg(typeof detail === "string" ? detail : "Failed to upload track. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-[#282828] border border-neutral-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl text-white">
        <button
          onClick={() => {
            setFetchedCoverUrl(null);
            setShowLoginPrompt(false);
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">Upload Song</h2>
        <p className="text-xs text-neutral-400 mb-4">
          Select an audio file and fetch official metadata and artwork.
        </p>

        {(!user || showLoginPrompt) && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-400">
            <span className="font-semibold leading-relaxed">
              Kindly log in to upload songs to your personal library.
            </span>
            <button
              type="button"
              onClick={handleOpenLogin}
              style={{ backgroundColor: currentTheme.primary }}
              className="px-3 py-1.5 text-black font-extrabold rounded-full flex items-center gap-1.5 transition flex-shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Audio File (.mp3, .wav, .m4a)*
            </label>
            <div className="flex items-center gap-3">
              <label
                style={{ backgroundColor: currentTheme.primary }}
                className="px-3.5 py-2 text-black font-bold text-xs rounded cursor-pointer transition hover:opacity-90"
              >
                Choose File
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioSelect}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-neutral-400 truncate max-w-[220px]">
                {audioFile ? audioFile.name : "No file chosen"}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Song Title
              </label>
              <button
                type="button"
                onClick={handleFetchMetadata}
                disabled={isSearching || !title.trim()}
                style={{ color: currentTheme.primary }}
                className="text-[11px] hover:underline flex items-center gap-1 font-semibold disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>{isSearching ? "Searching..." : "Auto-Fetch from Spotify"}</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. I'm Still Standing"
              className="w-full bg-[#181818] text-white text-xs px-3 py-2.5 rounded-md border border-neutral-700 outline-none transition focus:border-white/40"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Artist Name
            </label>
            <input
              type="text"
              required
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Elton John"
              className="w-full bg-[#181818] text-white text-xs px-3 py-2.5 rounded-md border border-neutral-700 outline-none transition focus:border-white/40"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
              Cover Artwork
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-neutral-900 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                {fetchedCoverUrl ? (
                  <img
                    src={fetchedCoverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-neutral-600" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="w-fit px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold text-xs rounded cursor-pointer transition">
                  Choose Custom File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleManualCoverSelect}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-neutral-400">
                  {coverFile
                    ? coverFile.name
                    : fetchedCoverUrl
                    ? "Official cover fetched"
                    : "Auto-fetched or optional"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            style={{ backgroundColor: currentTheme.primary }}
            className="w-full py-2.5 text-black font-extrabold text-xs rounded-full transition shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2 hover:opacity-90"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? "Uploading & Processing..." : "Add to Library"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}