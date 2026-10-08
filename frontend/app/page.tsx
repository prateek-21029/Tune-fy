"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Play, Pause, Heart, Music2, Clock, UploadCloud, FolderHeart } from "lucide-react";
import TrackMenu from "../components/TrackMenu";
import UploadModal from "../components/UploadModal";
import TopHeader from "../components/TopHeader";
import { useAudio, Track } from "../context/AudioContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface PlaylistSummary {
  id: number;
  name: string;
  coverUrl?: string | null;
  tracks: Track[];
}

export default function Home() {
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://tunefy-backend.onrender.com').replace(/\/$/, '');
  const { currentTheme, themeKey } = useTheme();
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [recentTrackIds, setRecentTrackIds] = useState<string[]>([]);

  const { currentTrack, isPlaying, playTrack, togglePlay, likedTrackIds, toggleLike } = useAudio();
  const { user, token, openAuthModal } = useAuth() as any;

  // Real-time synchronization of Recently Played tracks
  const loadRecentTrackIds = useCallback(() => {
    try {
      const stored = localStorage.getItem("tunefy_recent_tracks");
      if (stored) {
        setRecentTrackIds(JSON.parse(stored));
      }
    } catch {
      setRecentTrackIds([]);
    }
  }, []);

  useEffect(() => {
    loadRecentTrackIds();
    window.addEventListener("storage", loadRecentTrackIds);
    return () => window.removeEventListener("storage", loadRecentTrackIds);
  }, [loadRecentTrackIds, currentTrack]);

  const getAuthHeaders = useCallback(() => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  }, [token]);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await axios.get("https://tunefy-backend.onrender.com/api/tracks", {
        headers: getAuthHeaders(),
      });
      setTracks(res.data);
    } catch (err) {
      console.error("Failed to load tracks:", err);
    }
  }, [getAuthHeaders]);

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await axios.get("https://tunefy-backend.onrender.com/api/playlists", {
        headers: getAuthHeaders(),
      });
      setPlaylists(res.data);
    } catch (err) {
      console.error("Failed to load playlists:", err);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTracks();
    fetchPlaylists();
  }, [fetchTracks, fetchPlaylists, user, token]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const activeDisplayName = user ? (user.displayName || user.username) : "";

  // Compute displayed tracks
  const displayedTracks = useMemo(() => {
    if (!user) {
      return tracks;
    }
    if (recentTrackIds.length > 0) {
      const trackMap = new Map(tracks.map((t) => [t.id, t]));
      const resolved = recentTrackIds
        .map((id) => trackMap.get(id))
        .filter((t): t is Track => t !== undefined);
      if (resolved.length > 0) return resolved.slice(0, 18);
    }
    return tracks.slice(0, 18);
  }, [user, tracks, recentTrackIds]);

  const handleOpenUpload = () => {
    if (!user) {
      if (typeof openAuthModal === "function") openAuthModal();
      return;
    }
    setIsUploadOpen(true);
  };

  const handlePlayPlaylist = (pl: PlaylistSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pl.tracks.length > 0) {
      playTrack(pl.tracks[0], pl.tracks);
    }
  };

  const handlePlayLiked = (e: React.MouseEvent) => {
    e.stopPropagation();
    const likedTracks = tracks.filter((t) => likedTrackIds.includes(t.id));
    if (likedTracks.length > 0) {
      playTrack(likedTracks[0], likedTracks);
    }
  };

  const quickPlaylists = playlists.slice(0, 4);
  const contrastIconText = themeKey === "white" ? "fill-black text-black" : "fill-black text-black";
  const buttonTextColor = themeKey === "white" ? "text-black" : "text-black";

  return (
    <div
      style={{
        background: `linear-gradient(to bottom, ${currentTheme.gradientFrom}28 0%, #171717 35%, #121212 100%)`,
      }}
      className="flex-1 flex flex-col min-h-0 select-none overflow-y-auto"
    >
      <TopHeader />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchTracks}
      />

      <div className="p-8 pt-0 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {user ? `${greeting}, ${activeDisplayName}` : greeting}
          </h1>
          {!user && (
            <p className="text-xs text-neutral-400 mt-1">
              Previewing demo library. Log in to access your personal collection.
            </p>
          )}
        </div>

        {/* Quick-Access Top Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Liked Songs */}
          <div
            onClick={() => {
              if (!user) {
                if (typeof openAuthModal === "function") openAuthModal();
                return;
              }
              router.push("/playlist/liked");
            }}
            className="flex items-center bg-white/5 hover:bg-white/15 rounded-md overflow-hidden transition-all duration-200 group cursor-pointer relative shadow-sm"
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #450af5)`,
              }}
              className="w-16 h-16 flex items-center justify-center flex-shrink-0"
            >
              <Heart className="w-7 h-7 text-white fill-white" />
            </div>
            <div className="px-4 flex-1">
              <span className="font-bold text-sm text-white line-clamp-1">
                Liked Songs
              </span>
            </div>
            <button
              onClick={handlePlayLiked}
              style={{ backgroundColor: currentTheme.primary }}
              className="mr-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200"
              title="Play Liked Songs"
            >
              <Play className={`w-4 h-4 translate-x-0.5 ${contrastIconText}`} />
            </button>
          </div>

          {/* Uploaded Songs */}
          {user && (
            <div
              onClick={() => router.push("/playlist/uploads")}
              className="flex items-center bg-white/5 hover:bg-white/15 rounded-md overflow-hidden transition-all duration-200 group cursor-pointer relative shadow-sm"
            >
              <div
                style={{
                  background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #107c41)`,
                }}
                className="w-16 h-16 flex items-center justify-center flex-shrink-0"
              >
                <FolderHeart className="w-7 h-7 text-white" />
              </div>
              <div className="px-4 flex-1">
                <span className="font-bold text-sm text-white line-clamp-1">
                  Uploaded Songs
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (tracks.length > 0) playTrack(tracks[0], tracks);
                }}
                style={{ backgroundColor: currentTheme.primary }}
                className="mr-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200"
                title="Play Uploaded Songs"
              >
                <Play className={`w-4 h-4 translate-x-0.5 ${contrastIconText}`} />
              </button>
            </div>
          )}

          {quickPlaylists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => router.push(`/playlist/${pl.id}`)}
              className="flex items-center bg-white/5 hover:bg-white/15 rounded-md overflow-hidden transition-all duration-200 group cursor-pointer relative shadow-sm"
            >
              <div className="w-16 h-16 bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {pl.coverUrl ? (
                  <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                ) : (
                  <Music2 className="w-6 h-6 text-neutral-500" />
                )}
              </div>
              <div className="px-4 flex-1">
                <span className="font-bold text-sm text-white line-clamp-1">
                  {pl.name}
                </span>
              </div>
              <button
                onClick={(e) => handlePlayPlaylist(pl, e)}
                style={{ backgroundColor: currentTheme.primary }}
                className="mr-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all duration-200"
                title={`Play ${pl.name}`}
              >
                <Play className={`w-4 h-4 translate-x-0.5 ${contrastIconText}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Shelf: Recently Played for users, Featured Tracks for guests */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5" style={{ color: currentTheme.primary }} />
              <h2 className="text-xl font-bold text-white tracking-tight">
                {user ? "Recently Played" : "Featured Tracks"}
              </h2>
              <span className="text-xs bg-white/10 text-neutral-300 font-semibold px-2 py-0.5 rounded-full">
                {displayedTracks.length}
              </span>
            </div>

            {user && (
              <button
                onClick={handleOpenUpload}
                style={{ backgroundColor: currentTheme.primary }}
                className={`text-xs font-bold ${buttonTextColor} px-4 py-2 rounded-full flex items-center gap-1.5 transition hover:opacity-90 shadow-md active:scale-95`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Song</span>
              </button>
            )}
          </div>

          {displayedTracks.length === 0 ? (
            <div className="text-neutral-400 text-sm py-12 bg-white/5 rounded-xl text-center flex flex-col items-center justify-center gap-3 border border-dashed border-neutral-800">
              <p>
                {user
                  ? "No songs played yet. Click 'Upload Song' or play a track to start your history!"
                  : "No demo songs available."}
              </p>
              {user && (
                <button
                  onClick={handleOpenUpload}
                  style={{ backgroundColor: currentTheme.primary }}
                  className={`px-4 py-2 ${buttonTextColor} font-bold text-xs rounded-full transition hover:opacity-90 shadow-md active:scale-95`}
                >
                  Upload Your First Song
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {displayedTracks.map((track) => {
                const isCurrent = currentTrack?.id === track.id;
                const isLiked = likedTrackIds.includes(track.id);

                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, displayedTracks)}
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
                            playTrack(track, displayedTracks);
                          }
                        }}
                        style={{ backgroundColor: currentTheme.primary }}
                        className={`absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
                          isCurrent && isPlaying
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                        } hover:scale-105 active:scale-95`}
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className={`w-4 h-4 ${contrastIconText}`} />
                        ) : (
                          <Play className={`w-4 h-4 translate-x-0.5 ${contrastIconText}`} />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3
                          style={{ color: isCurrent ? currentTheme.primary : "white" }}
                          className="font-bold text-xs truncate"
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
                            if (!user) {
                              if (typeof openAuthModal === "function") openAuthModal();
                              return;
                            }
                            toggleLike(track.id);
                          }}
                          className="text-neutral-400 hover:text-white transition p-1"
                        >
                          <Heart
                            className="w-3.5 h-3.5"
                            style={{
                              fill: isLiked ? currentTheme.primary : "none",
                              color: isLiked ? currentTheme.primary : "currentColor",
                            }}
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
          )}
        </section>

        {/* Playlists Shelf */}
        {playlists.length > 0 && (
          <section className="pb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white hover:underline cursor-pointer">
                Your Playlists
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => router.push(`/playlist/${pl.id}`)}
                  className="bg-[#181818] hover:bg-[#282828] p-3.5 rounded-lg transition-all duration-300 group cursor-pointer flex flex-col shadow-sm"
                >
                  <div className="relative aspect-square w-full mb-3 shadow rounded-md overflow-hidden bg-neutral-800 flex items-center justify-center">
                    {pl.coverUrl ? (
                      <img src={pl.coverUrl} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-12 h-12 text-neutral-600" />
                    )}
                    {pl.tracks.length > 0 && (
                      <button
                        onClick={(e) => handlePlayPlaylist(pl, e)}
                        style={{ backgroundColor: currentTheme.primary }}
                        className="absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105 active:scale-95"
                      >
                        <Play className={`w-4 h-4 translate-x-0.5 ${contrastIconText}`} />
                      </button>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white truncate">
                      {pl.name}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      By {activeDisplayName || "You"} • {pl.tracks.length} {pl.tracks.length === 1 ? "song" : "songs"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}