"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import {
  Play,
  Pause,
  Clock,
  Heart,
  Music2,
  Trash2,
  MoreHorizontal,
  Edit2,
  Camera,
  ZoomIn,
  RotateCcw,
  X,
  FolderHeart,
} from "lucide-react";
import TopHeader from "../../../components/TopHeader";
import { useAudio, Track } from "../../../context/AudioContext";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import getCroppedImg, { Area } from "../../../utils/cropImage";
import api from "../../../utils/api";

interface PlaylistData {
  id: number | string;
  name: string;
  coverUrl?: string | null;
  tracks: Track[];
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function PlaylistDetail() {
  const params = useParams();
  const router = useRouter();
  const { currentTheme, themeKey } = useTheme();

  const rawId = params?.id;
  const playlistId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const isLikedView = playlistId === "liked";
  const isUploadsView = playlistId === "uploads";
  const isSpecialView = isLikedView || isUploadsView;

  const { user, token } = useAuth() as any;
  const {
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    likedTrackIds,
    toggleLike,
  } = useAudio();

  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [rawCoverSrc, setRawCoverSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeDisplayName = user
    ? user.displayName || user.username
    : "Tune-fy User";

  const getAuthHeaders = useCallback(() => {
    const activeToken =
      token ||
      (typeof window !== "undefined" ? localStorage.getItem("token") : null);
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  }, [token]);

  const fetchPlaylistData = useCallback(async () => {
    if (!playlistId || playlistId === "undefined") return;

    try {
      setLoading(true);
      const headers = getAuthHeaders();

      if (isLikedView) {
        const res = await api.get("/api/tracks", { headers });
        const allTracks: Track[] = res.data;
        const liked = allTracks.filter((t) => likedTrackIds.includes(t.id));
        setPlaylist({
          id: "liked",
          name: "Liked Songs",
          coverUrl: null,
          tracks: liked,
        });
      } else if (isUploadsView) {
        const res = await api.get("/api/tracks", { headers });
        setPlaylist({
          id: "uploads",
          name: "Uploaded Songs",
          coverUrl: null,
          tracks: res.data,
        });
      } else {
        const numId = parseInt(playlistId, 10);
        if (isNaN(numId)) {
          setPlaylist(null);
          return;
        }
        const res = await api.get(`/api/playlists/${numId}`, { headers });
        setPlaylist(res.data);
        setEditedTitle(res.data.name);
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setPlaylist(null);
    } finally {
      setLoading(false);
    }
  }, [playlistId, isLikedView, isUploadsView, likedTrackIds, getAuthHeaders]);

  useEffect(() => {
    if (playlistId && playlistId !== "undefined") {
      fetchPlaylistData();
    }
  }, [fetchPlaylistData, playlistId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || isSpecialView || !playlistId) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await api.patch(
        `/api/playlists/${playlistId}`,
        { name: editedTitle.trim() },
        { headers: getAuthHeaders() }
      );
      setPlaylist((prev) =>
        prev ? { ...prev, name: editedTitle.trim() } : prev
      );
    } catch (err) {
      console.error("Failed to rename playlist:", err);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isSpecialView) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawCoverSrc(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCroppedCover = async () => {
    if (!rawCoverSrc || !croppedAreaPixels || !playlistId) return;
    setIsUploadingCover(true);
    try {
      const croppedBlob = await getCroppedImg(
        rawCoverSrc,
        croppedAreaPixels,
        false
      );
      if (!croppedBlob) return;

      const formData = new FormData();
      formData.append("file", croppedBlob, "cover.jpg");

      const res = await api.post(
        `/api/playlists/${playlistId}/cover`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            ...getAuthHeaders(),
          },
        }
      );

      setPlaylist((prev) =>
        prev ? { ...prev, coverUrl: res.data.coverUrl } : prev
      );
      setRawCoverSrc(null);
    } catch (err) {
      console.error("Failed to upload playlist cover:", err);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleRemoveTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLikedView) {
      await toggleLike(trackId);
      return;
    }

    if (isUploadsView) {
      if (
        !confirm(
          "Are you sure you want to permanently delete this uploaded track?"
        )
      )
        return;
      try {
        await api.delete(`/api/tracks/${trackId}`, {
          headers: getAuthHeaders(),
        });
        fetchPlaylistData();
      } catch (err) {
        console.error("Failed to delete track:", err);
      }
      return;
    }

    try {
      await api.delete(`/api/playlists/${playlistId}/tracks/${trackId}`, {
        headers: getAuthHeaders(),
      });
      fetchPlaylistData();
    } catch (err) {
      console.error("Failed to remove track:", err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (isSpecialView || !playlistId) return;
    if (!confirm(`Are you sure you want to delete "${playlist?.name}"?`))
      return;

    try {
      await api.delete(`/api/playlists/${playlistId}`, {
        headers: getAuthHeaders(),
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete playlist:", err);
    }
  };

  const totalDurationString = useMemo(() => {
    if (!playlist || playlist.tracks.length === 0) return "0 min";
    const totalSecs = playlist.tracks.reduce(
      (acc, t) => acc + (t.duration || 0),
      0
    );
    const mins = Math.floor(totalSecs / 60);
    return `${mins} min`;
  }, [playlist]);

  const isPlaylistPlaying = useMemo(() => {
    if (!isPlaying || !currentTrack || !playlist) return false;
    return playlist.tracks.some((t) => t.id === currentTrack.id);
  }, [isPlaying, currentTrack, playlist]);

  const handleMainPlay = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    if (isPlaylistPlaying) {
      togglePlay();
    } else {
      playTrack(playlist.tracks[0], playlist.tracks);
    }
  };

  const contrastIconText =
    themeKey === "white" ? "fill-black text-black" : "fill-black text-black";

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#121212] items-center justify-center">
        <div className="text-neutral-400 font-bold animate-pulse">
          Loading playlist...
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#121212] items-center justify-center p-8">
        <h2 className="text-xl font-bold text-white mb-2">
          Playlist not found
        </h2>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-full hover:scale-105 transition"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] select-none overflow-y-auto">
      <TopHeader />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCoverSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Playlist Square Easy-Cropper Modal */}
      {rawCoverSrc && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#282828] border border-neutral-700 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl text-white">
            <button
              onClick={() => setRawCoverSrc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-700 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-4">Crop Playlist Artwork</h3>
            <div
              style={{ borderColor: currentTheme.primary }}
              className="relative w-56 h-56 mx-auto rounded-lg overflow-hidden bg-neutral-900 border-2 mb-4"
            >
              <Cropper
                image={rawCoverSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <div className="flex items-center gap-2 mb-6">
              <ZoomIn className="w-4 h-4 text-neutral-400" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ accentColor: currentTheme.primary }}
                className="w-full h-1 bg-neutral-600 rounded-lg cursor-pointer appearance-none"
              />
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                }}
                className="p-1 text-neutral-400 hover:text-white"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRawCoverSrc(null)}
                className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-full text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCroppedCover}
                disabled={isUploadingCover}
                style={{ backgroundColor: currentTheme.primary }}
                className="flex-1 py-2 text-black rounded-full text-xs font-extrabold flex items-center justify-center gap-1 hover:opacity-90 transition active:scale-95"
              >
                {isUploadingCover ? "Saving..." : "Apply Cover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div
        style={{
          background: `linear-gradient(to bottom, ${currentTheme.gradientFrom}55 0%, #171717 55%, #121212 100%)`,
        }}
        className="px-8 pt-6 pb-8 flex flex-col sm:flex-row items-end gap-6"
      >
        <div
          onClick={() => {
            if (!isSpecialView && fileInputRef.current)
              fileInputRef.current.click();
          }}
          className={`w-48 h-48 sm:w-56 sm:h-56 rounded-md shadow-2xl overflow-hidden bg-neutral-800 flex items-center justify-center flex-shrink-0 relative group ${
            !isSpecialView ? "cursor-pointer" : ""
          }`}
        >
          {isLikedView ? (
            <div
              style={{
                background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #450af5)`,
              }}
              className="w-full h-full flex items-center justify-center"
            >
              <Heart className="w-20 h-20 text-white fill-white shadow-xl" />
            </div>
          ) : isUploadsView ? (
            <div
              style={{
                background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, #107c41)`,
              }}
              className="w-full h-full flex items-center justify-center"
            >
              <FolderHeart className="w-20 h-20 text-white shadow-xl" />
            </div>
          ) : playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music2 className="w-20 h-20 text-neutral-600" />
          )}
          {!isSpecialView && (
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition text-white">
              <Camera className="w-8 h-8" />
              <span className="text-xs font-semibold">Choose photo</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">
            {isSpecialView ? "Collection" : "Playlist"}
          </span>
          {isEditingTitle ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              autoFocus
              style={{ borderColor: currentTheme.primary }}
              className="text-3xl sm:text-5xl font-black text-white bg-white/10 px-2 py-1 rounded outline-none border w-full max-w-xl"
            />
          ) : (
            <div
              onClick={() => {
                if (!isSpecialView) setIsEditingTitle(true);
              }}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                {playlist.name}
              </h1>
              {!isSpecialView && (
                <Edit2 className="w-5 h-5 text-neutral-400 opacity-0 group-hover:opacity-100 transition" />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-neutral-300 mt-2">
            <span className="font-bold text-white hover:underline cursor-pointer">
              {activeDisplayName}
            </span>
            <span>•</span>
            <span>
              {playlist.tracks.length}{" "}
              {playlist.tracks.length === 1 ? "song" : "songs"}
            </span>
            <span>•</span>
            <span className="text-neutral-400">{totalDurationString}</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-8 py-4 flex items-center gap-4">
        <button
          onClick={handleMainPlay}
          disabled={playlist.tracks.length === 0}
          style={{ backgroundColor: currentTheme.primary }}
          className="w-14 h-14 rounded-full hover:scale-105 active:scale-95 flex items-center justify-center shadow-xl transition disabled:opacity-40"
          title={isPlaylistPlaying ? "Pause" : "Play"}
        >
          {isPlaylistPlaying ? (
            <Pause className={`w-6 h-6 ${contrastIconText}`} />
          ) : (
            <Play className={`w-6 h-6 translate-x-0.5 ${contrastIconText}`} />
          )}
        </button>

        {!isSpecialView && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-neutral-400 hover:text-white transition rounded-full hover:bg-white/10"
              title="More options"
            >
              <MoreHorizontal className="w-6 h-6" />
            </button>
            {showMenu && (
              <div className="absolute left-0 mt-2 w-48 bg-[#282828] border border-neutral-700 rounded-lg p-1 shadow-2xl z-40">
                <button
                  onClick={handleDeletePlaylist}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-neutral-700/80 rounded transition text-left"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete playlist</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tracks Table */}
      <div className="px-8 pb-12">
        <div className="grid grid-cols-12 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 pb-2 mb-3 px-3">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6">Title</div>
          <div className="col-span-4">Artist</div>
          <div className="col-span-1 flex justify-end">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {playlist.tracks.length === 0 ? (
          <div className="text-center py-16 text-neutral-500 text-sm">
            {isUploadsView
              ? "You haven't uploaded any songs yet. Click 'Upload Song' to build your collection!"
              : "This playlist has no songs yet. Add some tracks!"}
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.includes(track.id);

              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, playlist.tracks)}
                  className={`grid grid-cols-12 items-center p-2 rounded-md hover:bg-white/10 transition group cursor-pointer ${
                    isCurrent ? "bg-white/5" : ""
                  }`}
                >
                  <div className="col-span-1 flex items-center justify-center text-xs text-neutral-400">
                    <span className="group-hover:hidden">
                      {isCurrent && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3">
                          <span
                            style={{ backgroundColor: currentTheme.primary }}
                            className="w-0.5 h-3 animate-pulse"
                          />
                          <span
                            style={{ backgroundColor: currentTheme.primary }}
                            className="w-0.5 h-2 animate-pulse delay-75"
                          />
                          <span
                            style={{ backgroundColor: currentTheme.primary }}
                            className="w-0.5 h-3.5 animate-pulse delay-150"
                          />
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrent) {
                          togglePlay();
                        } else {
                          playTrack(track, playlist.tracks);
                        }
                      }}
                      className="hidden group-hover:block"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-white text-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                      )}
                    </button>
                  </div>

                  <div className="col-span-6 flex items-center gap-3 pr-2">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p
                        style={{
                          color: isCurrent ? currentTheme.primary : "white",
                        }}
                        className="text-sm font-semibold truncate"
                      >
                        {track.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate sm:hidden">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-4 hidden sm:block text-xs text-neutral-300 truncate pr-2">
                    {track.artist}
                  </div>

                  <div className="col-span-5 sm:col-span-1 flex items-center justify-end gap-3 text-xs text-neutral-400 font-mono">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-white transition"
                      title={isLiked ? "Unlike" : "Like"}
                    >
                      <Heart
                        className="w-3.5 h-3.5"
                        style={{
                          fill: isLiked ? currentTheme.primary : "none",
                          color: isLiked
                            ? currentTheme.primary
                            : "currentColor",
                        }}
                      />
                    </button>
                    <span>{formatDuration(track.duration || 0)}</span>
                    <button
                      onClick={(e) => handleRemoveTrack(track.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
                      title={
                        isUploadsView ? "Delete track" : "Remove from playlist"
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}