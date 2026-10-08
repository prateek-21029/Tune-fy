"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Heart, Play, Pause, Clock } from "lucide-react";
import TrackMenu from "../../../components/TrackMenu";
import { useAudio, Track } from "../../../context/AudioContext";

function formatDuration(seconds?: number) {
  if (!seconds) return "3:30";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function LikedSongsPage() {
  const { currentTrack, isPlaying, playTrack, likedTrackIds, toggleLike } = useAudio();
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLikedTracks = async () => {
    try {
      const res = await axios.get("https://tunefy-backend.onrender.com/api/tracks");
      const allTracks: Track[] = res.data;
      setLikedTracks(allTracks.filter((t) => likedTrackIds.includes(t.id)));
    } catch (err) {
      console.error("Error fetching tracks for liked songs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikedTracks();
  }, [likedTrackIds]);

  return (
    <div className="bg-gradient-to-b from-indigo-900 via-neutral-900 to-[#121212] min-h-full select-none">
      {/* Header Banner */}
      <div className="flex items-end gap-6 p-8 bg-gradient-to-b from-indigo-800/60 to-transparent">
        <div className="w-52 h-52 bg-gradient-to-br from-indigo-600 to-emerald-400 rounded-md shadow-2xl flex items-center justify-center flex-shrink-0">
          <Heart className="w-24 h-24 fill-white text-white" />
        </div>
        <div>
          <p className="text-xs uppercase font-bold tracking-wider mb-2">Playlist</p>
          <h1 className="text-6xl font-extrabold mb-4">Liked Songs</h1>
          <p className="text-sm text-neutral-300 font-medium">
            {likedTracks.length} {likedTracks.length === 1 ? "song" : "songs"}
          </p>
        </div>
      </div>

      {/* Track Table */}
      <div className="p-8">
        <div className="grid grid-cols-[16px_1fr_120px] gap-4 px-4 py-2 border-b border-white/10 text-neutral-400 text-xs font-semibold uppercase mb-4">
          <span>#</span>
          <span>Title</span>
          <div className="flex justify-end">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {loading ? (
          <p className="text-neutral-400 px-4 text-sm">Loading songs...</p>
        ) : likedTracks.length === 0 ? (
          <p className="text-neutral-400 px-4 text-sm">Songs you like will appear here.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {likedTracks.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, likedTracks)}
                  className="grid grid-cols-[16px_1fr_120px] gap-4 items-center px-4 py-2 rounded-md hover:bg-white/10 transition group cursor-pointer"
                >
                  <span className="text-sm text-neutral-400 group-hover:hidden">
                    {idx + 1}
                  </span>
                  <button className="hidden group-hover:flex items-center text-white">
                    {isCurrent && isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                  </button>

                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p className={`text-sm font-medium truncate ${isCurrent ? "text-[#1db954]" : "text-white"}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <TrackMenu
                      trackId={track.id}
                      trackTitle={track.title}
                      onTrackDeleted={fetchLikedTracks}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLike(track.id);
                      }}
                      className="text-[#1db954] p-1"
                    >
                      <Heart className="w-4 h-4 fill-[#1db954]" />
                    </button>
                    {/* Real Duration Display */}
                    <span className="text-xs text-neutral-400 w-10 text-right">
                      {formatDuration(track.duration)}
                    </span>
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