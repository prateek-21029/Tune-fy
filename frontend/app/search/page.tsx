"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Search as SearchIcon,
  Play,
  Pause,
  Heart,
  Music,
  X,
  Sparkles,
} from "lucide-react";
import TopHeader from "../../components/TopHeader";
import TrackMenu from "../../components/TrackMenu";
import { useAudio, Track } from "../../context/AudioContext";
import { useAuth } from "../../context/AuthContext";

const GENRES = [
  { name: "Pop", color: "from-pink-600 to-rose-700" },
  { name: "Hip-Hop", color: "from-amber-600 to-orange-700" },
  { name: "Rock", color: "from-red-600 to-red-800" },
  { name: "Electronic", color: "from-blue-600 to-indigo-700" },
  { name: "Lo-Fi / Chill", color: "from-teal-600 to-emerald-700" },
  { name: "Acoustic", color: "from-purple-600 to-violet-800" },
  { name: "Synthwave", color: "from-fuchsia-600 to-purple-800" },
  { name: "Ambient", color: "from-sky-600 to-cyan-800" },
];

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "3:20";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [onlineSuggestion, setOnlineSuggestion] = useState<{
    title: string;
    artist: string;
    coverUrl: string | null;
  } | null>(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);

  const { token, user } = useAuth() as any;
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
  } = useAudio();

  const getAuthHeaders = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  }, [token]);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/tracks", {
        headers: getAuthHeaders(),
      });
      setAllTracks(res.data);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks, user]);

  // Local track search
  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q)
    );
  }, [query, allTracks]);

  // Online metadata fallback debounce when local returns 0 matches
  useEffect(() => {
    const q = query.trim();
    if (!q || filteredTracks.length > 0) {
      setOnlineSuggestion(null);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const res = await axios.get("http://localhost:8000/api/spotify/search", {
          params: { q },
        });
        if (res.data?.title && res.data.title.toLowerCase() !== q.toLowerCase()) {
          setOnlineSuggestion(res.data);
        } else if (res.data?.artist) {
          setOnlineSuggestion(res.data);
        } else {
          setOnlineSuggestion(null);
        }
      } catch {
        setOnlineSuggestion(null);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, filteredTracks.length]);

  const topResult = filteredTracks[0] || null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] select-none overflow-y-auto">
      <TopHeader />

      <div className="p-8 pt-2 space-y-6">
        {/* Search Input Bar */}
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="What do you want to play?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white text-xs font-medium placeholder-neutral-400 pl-10 pr-9 py-3 rounded-full border border-transparent focus:border-white/20 outline-none transition shadow-inner"
          />
          {query.trim() && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white transition"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Active */}
        {query.trim() !== "" ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Results for &quot;{query}&quot;
              </h2>
              {filteredTracks.length > 0 && (
                <span className="text-xs text-neutral-400">
                  {filteredTracks.length} {filteredTracks.length === 1 ? "track" : "tracks"} found
                </span>
              )}
            </div>

            {filteredTracks.length === 0 ? (
              <div className="space-y-6 py-6">
                <div className="text-neutral-400 text-sm bg-white/5 border border-dashed border-neutral-800 rounded-xl p-8 text-center">
                  <p className="font-semibold text-white mb-1">
                    No songs found in your library matching &quot;{query}&quot;
                  </p>
                  <p className="text-xs text-neutral-400">
                    Try searching for another artist or upload this song using the upload button.
                  </p>
                </div>

                {/* Online Metadata Suggestion Card */}
                {isSearchingOnline ? (
                  <div className="flex items-center gap-2 text-xs text-neutral-400 animate-pulse">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Searching global music database...</span>
                  </div>
                ) : onlineSuggestion ? (
                  <div className="bg-[#181818] border border-neutral-800 p-4 rounded-xl max-w-md">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#1db954]" />
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                        Available on Spotify / iTunes
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {onlineSuggestion.coverUrl ? (
                        <img
                          src={onlineSuggestion.coverUrl}
                          alt={onlineSuggestion.title}
                          className="w-14 h-14 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-md bg-neutral-800 flex items-center justify-center">
                          <Music className="w-6 h-6 text-neutral-500" />
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <p className="text-sm font-bold text-white truncate">
                          {onlineSuggestion.title}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {onlineSuggestion.artist}
                        </p>
                        <span className="text-[10px] text-blue-400 mt-1 block">
                          Upload your MP3 file to add this track to your library.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Result + Top Matches */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  {/* Top Result Card */}
                  {topResult && (
                    <div
                      onClick={() => playTrack(topResult, filteredTracks)}
                      className="md:col-span-5 bg-[#181818] hover:bg-[#282828] p-5 rounded-xl transition duration-300 group cursor-pointer relative flex flex-col justify-between shadow-sm"
                    >
                      <div className="relative w-24 h-24 mb-4 rounded-lg overflow-hidden shadow-lg bg-neutral-800">
                        <img
                          src={topResult.coverUrl}
                          alt={topResult.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1 block">
                          Top Result
                        </span>
                        <h3 className="text-2xl font-black text-white truncate">
                          {topResult.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 truncate">
                          Song • <span className="text-white font-medium">{topResult.artist}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentTrack?.id === topResult.id) {
                            togglePlay();
                          } else {
                            playTrack(topResult, filteredTracks);
                          }
                        }}
                        className={`absolute bottom-5 right-5 w-12 h-12 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all duration-300 ${
                          currentTrack?.id === topResult.id && isPlaying
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                        } hover:scale-105 active:scale-95`}
                      >
                        {currentTrack?.id === topResult.id && isPlaying ? (
                          <Pause className="w-5 h-5 fill-black text-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black text-black translate-x-0.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Songs Rows List */}
                  <div className="md:col-span-7 space-y-1">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      Songs
                    </h4>
                    {filteredTracks.slice(0, 4).map((track) => {
                      const isCurrent = currentTrack?.id === track.id;
                      const isLiked = likedTrackIds.includes(track.id);

                      return (
                        <div
                          key={track.id}
                          onClick={() => playTrack(track, filteredTracks)}
                          className={`flex items-center justify-between p-2 rounded-md hover:bg-white/10 transition group cursor-pointer ${
                            isCurrent ? "bg-white/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1 mr-3">
                            <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-neutral-800">
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, filteredTracks);
                                  }
                                }}
                                className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center"
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-3.5 h-3.5 fill-white text-white" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
                                )}
                              </button>
                            </div>
                            <div className="overflow-hidden">
                              <p
                                className={`text-xs font-semibold truncate ${
                                  isCurrent ? "text-[#1db954]" : "text-white"
                                }`}
                              >
                                {track.title}
                              </p>
                              <p className="text-[11px] text-neutral-400 truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(track.id);
                              }}
                              className="p-1 text-neutral-400 hover:text-white transition"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  isLiked ? "fill-[#1db954] text-[#1db954]" : ""
                                }`}
                              />
                            </button>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {formatDuration(track.duration || 0)}
                            </span>
                            {user && track.userId === user.id && (
                              <TrackMenu
                                trackId={track.id}
                                trackTitle={track.title}
                                trackArtist={track.artist}
                                trackCoverUrl={track.coverUrl}
                                onTrackUpdated={fetchTracks}
                                onTrackDeleted={fetchTracks}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Remaining Grid of Tracks */}
                {filteredTracks.length > 4 && (
                  <div>
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                      More Results
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                      {filteredTracks.slice(4).map((track) => {
                        const isCurrent = currentTrack?.id === track.id;
                        const isLiked = likedTrackIds.includes(track.id);

                        return (
                          <div
                            key={track.id}
                            onClick={() => playTrack(track, filteredTracks)}
                            className="bg-[#181818] hover:bg-[#282828] p-3.5 rounded-lg transition-all duration-300 group cursor-pointer flex flex-col shadow-sm"
                          >
                            <div className="relative aspect-square w-full mb-3 shadow rounded-md overflow-hidden bg-neutral-800">
                              <img
                                src={track.coverUrl}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isCurrent) {
                                    togglePlay();
                                  } else {
                                    playTrack(track, filteredTracks);
                                  }
                                }}
                                className={`absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1db954] hover:bg-[#1ed760] text-black flex items-center justify-center shadow-xl transition-all duration-300 ${
                                  isCurrent && isPlaying
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                                } hover:scale-105`}
                              >
                                {isCurrent && isPlaying ? (
                                  <Pause className="w-4 h-4 fill-black text-black" />
                                ) : (
                                  <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3
                                  className={`font-bold text-xs truncate ${
                                    isCurrent ? "text-[#1db954]" : "text-white"
                                  }`}
                                >
                                  {track.title}
                                </h3>
                                <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                                  {track.artist}
                                </p>
                              </div>

                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLike(track.id);
                                  }}
                                  className="text-neutral-400 hover:text-white transition p-1"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      isLiked ? "fill-[#1db954] text-[#1db954]" : ""
                                    }`}
                                  />
                                </button>

                                {user && track.userId === user.id && (
                                  <TrackMenu
                                    trackId={track.id}
                                    trackTitle={track.title}
                                    trackArtist={track.artist}
                                    trackCoverUrl={track.coverUrl}
                                    onTrackUpdated={fetchTracks}
                                    onTrackDeleted={fetchTracks}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Browse All Genres */
          <div>
            <h2 className="text-xl font-bold text-white mb-4 tracking-tight">Browse all</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {GENRES.map((genre) => (
                <div
                  key={genre.name}
                  onClick={() => setQuery(genre.name.split("/")[0].trim())}
                  className={`h-28 rounded-lg p-4 bg-gradient-to-br ${genre.color} flex justify-between overflow-hidden relative cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition shadow-md group`}
                >
                  <span className="font-extrabold text-base text-white">
                    {genre.name}
                  </span>
                  <Music className="w-12 h-12 text-black/25 absolute -bottom-2 -right-2 rotate-12 group-hover:scale-110 transition" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}