"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
  Tv2,
  Laptop2,
  ChevronDown,
} from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useTheme } from "../context/ThemeContext";

function formatTime(secs: number): string {
  if (isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function PlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    likedTrackIds,
    isShuffle,
    repeatMode,
    isLyricsOpen,
    isQueueOpen,
    isNowPlayingOpen,
    isDevicesOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleLyrics,
    toggleQueue,
    toggleNowPlaying,
    toggleDevices,
    toggleLike,
  } = useAudio();

  const { currentTheme } = useTheme();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [prevVolume, setPrevVolume] = useState<number>(0.8);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  useEffect(() => {
    if (!isScrubbing) {
      setScrubTime(currentTime);
    }
  }, [currentTime, isScrubbing]);

  if (!currentTrack) return null;

  const isLiked = likedTrackIds.includes(currentTrack.id);
  const activeTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (activeTime / duration) * 100)) : 0;
  const volumePercent = Math.min(100, Math.max(0, volume * 100));

  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubTime(parseFloat(e.target.value));
  };

  const handleScrubCommit = () => {
    seek(scrubTime);
    setIsScrubbing(false);
  };

  const handleMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  const renderVolumeIcon = () => {
    if (volume === 0)
      return <VolumeX className="w-4 h-4 text-neutral-400 hover:text-white" />;
    if (volume < 0.5)
      return <Volume1 className="w-4 h-4 text-neutral-400 hover:text-white" />;
    return <Volume2 className="w-4 h-4 text-neutral-400 hover:text-white" />;
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOBILE COMPACT BAR (Screens < 768px)                         */}
      {/* ============================================================== */}
      <div className="md:hidden fixed bottom-16 left-2 right-2 z-40 bg-[#181818]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden select-none transition-all">
        {/* Hairline Progress Bar */}
        <div className="w-full h-1 bg-white/10">
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentTheme.primary,
            }}
          />
        </div>

        <div className="px-3 py-2 flex flex-col gap-1.5">
          {/* Top Row: Artwork, Title, Artist, Timestamp, and Like */}
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={() => setIsMobileExpanded(true)}
              className="flex items-center gap-2.5 overflow-hidden flex-1 cursor-pointer"
            >
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-md object-cover flex-shrink-0 shadow"
              />
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">
                  {currentTrack.title}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 truncate">
                  <span className="truncate">{currentTrack.artist}</span>
                  <span>•</span>
                  <span className="font-mono text-neutral-300">
                    {formatTime(activeTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => toggleLike(currentTrack.id)}
              className="p-1.5 text-neutral-400 hover:text-white transition flex-shrink-0 active:scale-90"
            >
              <Heart
                className="w-4 h-4"
                style={{
                  fill: isLiked ? currentTheme.primary : "none",
                  color: isLiked ? currentTheme.primary : "currentColor",
                }}
              />
            </button>
          </div>

          {/* Bottom Row Controls */}
          <div className="flex items-center justify-around pt-1 border-t border-white/5">
            <button
              onClick={toggleShuffle}
              className="p-1.5 transition active:scale-90"
              style={{ color: isShuffle ? currentTheme.primary : "#9ca3af" }}
              title={isShuffle ? "Shuffle On" : "Shuffle Off"}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 text-neutral-200 hover:text-white active:scale-90 transition"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              style={{ backgroundColor: currentTheme.primary }}
              className="w-9 h-9 rounded-full text-black flex items-center justify-center shadow-lg active:scale-90 transition"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 text-neutral-200 hover:text-white active:scale-90 transition"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className="p-1.5 transition active:scale-90"
              style={{
                color: repeatMode !== "off" ? currentTheme.primary : "#9ca3af",
              }}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === "one" ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. MOBILE FULL-SCREEN SLIDE-UP VIEW                             */}
      {/* ============================================================== */}
      {isMobileExpanded && (
        <div className="md:hidden fixed inset-0 z-50 bg-gradient-to-b from-[#1c1c1c] via-[#121212] to-black p-6 flex flex-col justify-between select-none animate-in slide-in-from-bottom duration-300">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between text-neutral-400">
            <button
              onClick={() => setIsMobileExpanded(false)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition active:scale-90"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
              Now Playing
            </span>

            <button
              onClick={toggleLyrics}
              className="p-2 rounded-full hover:bg-white/10 transition active:scale-90"
              style={{
                color: isLyricsOpen ? currentTheme.primary : "currentColor",
              }}
            >
              <Mic2 className="w-5 h-5" />
            </button>
          </div>

          {/* Album Artwork & Details */}
          <div className="my-auto flex flex-col items-center">
            <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/10 mb-6 transition-transform">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="w-full flex items-center justify-between px-2">
              <div className="overflow-hidden pr-2">
                <h2 className="text-xl font-black text-white truncate">
                  {currentTrack.title}
                </h2>
                <p className="text-sm font-medium text-neutral-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>

              <button
                onClick={() => toggleLike(currentTrack.id)}
                className="p-2 transition active:scale-90"
              >
                <Heart
                  className="w-6 h-6"
                  style={{
                    fill: isLiked ? currentTheme.primary : "none",
                    color: isLiked ? currentTheme.primary : "white",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Controls, Progress, and Extra Mobile Utilities */}
          <div className="w-full space-y-4 pb-4">
            <div>
              <div className="relative flex items-center py-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={activeTime}
                  onMouseDown={() => setIsScrubbing(true)}
                  onTouchStart={() => setIsScrubbing(true)}
                  onChange={handleScrubChange}
                  onMouseUp={handleScrubCommit}
                  onTouchEnd={handleScrubCommit}
                  style={{
                    background: `linear-gradient(to right, ${currentTheme.gradientFrom} 0%, ${currentTheme.gradientTo} ${progressPercent}%, #333333 ${progressPercent}%, #333333 100%)`,
                  }}
                  className="w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <span>{formatTime(activeTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Playback Button Row */}
            <div className="flex items-center justify-between px-4">
              <button
                onClick={toggleShuffle}
                className="p-2 transition active:scale-90"
                style={{ color: isShuffle ? currentTheme.primary : "#9ca3af" }}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              <button
                onClick={prevTrack}
                className="p-2 text-white active:scale-90 transition"
              >
                <SkipBack className="w-7 h-7 fill-white" />
              </button>

              <button
                onClick={togglePlay}
                style={{ backgroundColor: currentTheme.primary }}
                className="w-16 h-16 rounded-full text-black flex items-center justify-center shadow-xl active:scale-95 transition"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black text-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black text-black translate-x-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 text-white active:scale-90 transition"
              >
                <SkipForward className="w-7 h-7 fill-white" />
              </button>

              <button
                onClick={toggleRepeat}
                className="p-2 transition active:scale-90"
                style={{
                  color: repeatMode !== "off" ? currentTheme.primary : "#9ca3af",
                }}
              >
                {repeatMode === "one" ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Mobile Utility Row: Connect Devices, Queue, & Lyrics */}
            <div className="flex items-center justify-around pt-3 border-t border-white/10 text-neutral-400">
              <button
                onClick={toggleDevices}
                className="p-2 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                style={{
                  color: isDevicesOpen ? currentTheme.primary : "#a3a3a3",
                }}
                title="Connect device"
              >
                <Laptop2 className="w-5 h-5" />
                <span className="text-[11px] font-semibold">Devices</span>
              </button>

              <button
                onClick={toggleLyrics}
                className="p-2 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                style={{
                  color: isLyricsOpen ? currentTheme.primary : "#a3a3a3",
                }}
                title="Lyrics"
              >
                <Mic2 className="w-5 h-5" />
                <span className="text-[11px] font-semibold">Lyrics</span>
              </button>

              <button
                onClick={toggleQueue}
                className="p-2 rounded-lg flex items-center gap-1.5 transition active:scale-95"
                style={{
                  color: isQueueOpen ? currentTheme.primary : "#a3a3a3",
                }}
                title="Queue"
              >
                <ListMusic className="w-5 h-5" />
                <span className="text-[11px] font-semibold">Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DESKTOP BAR (Screens >= 768px)                               */}
      {/* ============================================================== */}
      <footer className="hidden md:flex h-20 bg-black border-t border-neutral-800 px-4 items-center justify-between select-none z-40 fixed bottom-0 left-0 right-0">
        <div className="flex items-center gap-3 w-[30%] min-w-[180px] max-w-[340px]">
          <div
            onClick={toggleNowPlaying}
            className="w-14 h-14 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 shadow-md cursor-pointer hover:opacity-90 transition"
          >
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="overflow-hidden pr-2">
            <p
              onClick={toggleNowPlaying}
              className="text-xs font-bold text-white truncate hover:underline cursor-pointer"
            >
              {currentTrack.title}
            </p>
            <p
              onClick={toggleNowPlaying}
              className="text-[11px] text-neutral-400 truncate hover:underline cursor-pointer mt-0.5"
            >
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleLike(currentTrack.id)}
            className="text-neutral-400 hover:text-white transition flex-shrink-0 p-1"
          >
            <Heart
              className="w-4 h-4"
              style={{
                fill: isLiked ? currentTheme.primary : "none",
                color: isLiked ? currentTheme.primary : "currentColor",
              }}
            />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5 w-[40%] max-w-2xl px-2">
          <div className="flex items-center gap-5">
            <button
              onClick={toggleShuffle}
              className="transition relative p-1"
              style={{ color: isShuffle ? currentTheme.primary : "#a3a3a3" }}
              title={isShuffle ? "Shuffle on" : "Shuffle off"}
            >
              <Shuffle className="w-4 h-4" />
              {isShuffle && (
                <span
                  style={{ backgroundColor: currentTheme.primary }}
                  className="w-1 h-1 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"
                />
              )}
            </button>

            <button
              onClick={prevTrack}
              className="text-neutral-300 hover:text-white transition p-1"
              title="Previous"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white hover:scale-105 active:scale-95 text-black flex items-center justify-center transition shadow-md"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-black text-black" />
              ) : (
                <Play className="w-4 h-4 fill-black text-black translate-x-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="text-neutral-300 hover:text-white transition p-1"
              title="Next"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className="transition relative p-1"
              style={{
                color: repeatMode !== "off" ? currentTheme.primary : "#a3a3a3",
              }}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === "one" ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
              {repeatMode !== "off" && (
                <span
                  style={{ backgroundColor: currentTheme.primary }}
                  className="w-1 h-1 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"
                />
              )}
            </button>
          </div>

          <div className="w-full flex items-center gap-2">
            <span className="text-[11px] text-neutral-400 tabular-nums w-8 text-right font-medium font-mono">
              {formatTime(activeTime)}
            </span>
            <div className="relative flex-1 flex items-center group py-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={activeTime}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={handleScrubChange}
                onMouseUp={handleScrubCommit}
                onTouchEnd={handleScrubCommit}
                style={{
                  background: `linear-gradient(to right, ${currentTheme.gradientFrom} 0%, ${currentTheme.gradientTo} ${progressPercent}%, #333333 ${progressPercent}%, #333333 100%)`,
                }}
                className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer outline-none transition-all group-hover:h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 group-hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-all"
              />
            </div>
            <span className="text-[11px] text-neutral-400 tabular-nums w-8 font-medium font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-[30%] min-w-[200px]">
          <button
            onClick={toggleNowPlaying}
            className="p-1 transition rounded"
            style={{
              color: isNowPlayingOpen ? currentTheme.primary : "#a3a3a3",
            }}
            title="Now Playing"
          >
            <Tv2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLyrics}
            className="p-1 transition rounded"
            style={{
              color: isLyricsOpen ? currentTheme.primary : "#a3a3a3",
            }}
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          <button
            onClick={toggleQueue}
            className="p-1 transition rounded"
            style={{
              color: isQueueOpen ? currentTheme.primary : "#a3a3a3",
            }}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={toggleDevices}
            className="p-1 transition rounded"
            style={{
              color: isDevicesOpen ? currentTheme.primary : "#a3a3a3",
            }}
            title="Connect device"
          >
            <Laptop2 className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 group w-28 pl-1">
            <button onClick={handleMuteToggle} className="p-0.5 transition">
              {renderVolumeIcon()}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, ${currentTheme.gradientFrom} 0%, ${currentTheme.gradientTo} ${volumePercent}%, #333333 ${volumePercent}%, #333333 100%)`,
              }}
              className="w-full h-1 bg-transparent rounded-lg appearance-none cursor-pointer outline-none transition-all group-hover:h-1.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100 group-hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-all"
            />
          </div>
        </div>
      </footer>
    </>
  );
}