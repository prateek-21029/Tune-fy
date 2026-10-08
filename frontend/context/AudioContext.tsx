"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

export interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration?: number;
  userId?: number | null;
  artistBio?: string | null;
}

export type RepeatMode = "off" | "all" | "one";

export interface AudioDevice {
  deviceId: string;
  label: string;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  likedTrackIds: string[];
  queue: Track[];
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isNowPlayingOpen: boolean;
  isDevicesOpen: boolean;
  availableDevices: AudioDevice[];
  currentDeviceId: string;

  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (val: number) => void;
  changeVolume: (val: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLyrics: () => void;
  toggleQueue: () => void;
  toggleNowPlaying: () => void;
  closeNowPlaying: () => void;
  toggleDevices: () => void;
  closeDevices: () => void;
  setAudioOutputDevice: (deviceId: string) => Promise<void>;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleLike: (trackId: string) => Promise<void>;
  updateTrackBio: (trackId: string, newBio: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  shuffleQueue: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tunefy_volume");
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
      }
    }
    return 0.8;
  });

  const [likedTrackIds, setLikedTrackIds] = useState<string[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<AudioDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>("default");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const lastSkipTimeRef = useRef<number>(0);

  // Synchronized refs to avoid stale closures
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;
  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;
  const currentTrackRef = useRef<Track | null>(currentTrack);
  currentTrackRef.current = currentTrack;
  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    setQueue((prevQueue) => {
      const updated = [...prevQueue];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      queueRef.current = updated;
      return updated;
    });
  }, []);

  const shuffleQueue = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length <= 2) return prevQueue;
      const currentIndex = prevQueue.findIndex(
        (t) => t.id === currentTrackRef.current?.id
      );
      const current =
        currentIndex !== -1 ? prevQueue[currentIndex] : prevQueue[0];
      const remainder = prevQueue.filter((_, idx) => idx !== currentIndex);

      for (let i = remainder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainder[i], remainder[j]] = [remainder[j], remainder[i]];
      }

      const shuffled = [current, ...remainder];
      queueRef.current = shuffled;
      return shuffled;
    });
  }, []);

  // Safe playback execution preventing AbortError
  const safePlay = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      playPromiseRef.current = audioRef.current.play();
      await playPromiseRef.current;
      setIsPlaying(true);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Playback error:", err);
      }
      setIsPlaying(false);
    } finally {
      playPromiseRef.current = null;
    }
  }, []);

  // Safe pause execution preventing AbortError
  const safePause = useCallback(async () => {
    if (!audioRef.current) return;
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Suppress handled aborts
      }
    }
    audioRef.current.pause();
    setIsPlaying(false);
  }, []);

  // Reset playback and collapse panels on Login or Logout
  useEffect(() => {
    setIsNowPlayingOpen(false);
    setIsQueueOpen(false);
    setIsLyricsOpen(false);
    setIsDevicesOpen(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.currentTime = 0;
    }
    setCurrentTrack(null);
    currentTrackRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setQueue([]);
    queueRef.current = [];
  }, [user]);

  const playTrack = useCallback(
    async (track: Track, newQueue?: Track[]) => {
      if (!audioRef.current) return;
      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        queueRef.current = newQueue;
      }
      setCurrentTrack(track);
      currentTrackRef.current = track;

      try {
        const stored = localStorage.getItem("tunefy_recent_tracks");
        const existing: string[] = stored ? JSON.parse(stored) : [];
        const updated = [
          track.id,
          ...existing.filter((id) => id !== track.id),
        ].slice(0, 25);
        localStorage.setItem(
          "tunefy_recent_tracks",
          JSON.stringify(updated)
        );
        window.dispatchEvent(new Event("storage"));
      } catch (err) {
        console.error("Failed to save recent track:", err);
      }

      if (playPromiseRef.current) {
        try {
          await playPromiseRef.current;
        } catch {}
      }

      audioRef.current.src = track.audioUrl;
      audioRef.current.load();
      await safePlay();
    },
    [safePlay]
  );

  const togglePlay = useCallback(async () => {
    if (!audioRef.current || !currentTrackRef.current) return;
    if (isPlayingRef.current) {
      await safePause();
    } else {
      await safePlay();
    }
  }, [safePause, safePlay]);

  const seek = useCallback((seconds: number) => {
    if (audioRef.current) {
      const targetTime = Math.max(
        0,
        Math.min(seconds, audioRef.current.duration || seconds)
      );
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    try {
      localStorage.setItem("tunefy_volume", clamped.toString());
    } catch {}
  }, []);

  const nextTrack = useCallback(async () => {
    const now = Date.now();
    if (now - lastSkipTimeRef.current < 350) return;
    lastSkipTimeRef.current = now;

    const q = queueRef.current;
    const curr = currentTrackRef.current;
    if (!curr || q.length === 0) return;

    if (repeatModeRef.current === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        await safePlay();
      }
      return;
    }

    if (isShuffleRef.current && q.length > 1) {
      const remaining = q.filter((t) => t.id !== curr.id);
      const randomTrack =
        remaining[Math.floor(Math.random() * remaining.length)];
      await playTrack(randomTrack);
      return;
    }

    const idx = q.findIndex((t) => t.id === curr.id);
    if (idx !== -1 && idx + 1 < q.length) {
      await playTrack(q[idx + 1]);
    } else if (repeatModeRef.current === "all" && q.length > 0) {
      await playTrack(q[0]);
    } else {
      await safePause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [playTrack, safePause, safePlay]);

  const prevTrack = useCallback(async () => {
    const now = Date.now();
    if (now - lastSkipTimeRef.current < 350) return;
    lastSkipTimeRef.current = now;

    const curr = currentTrackRef.current;
    if (!curr || queueRef.current.length === 0) return;

    if (repeatModeRef.current === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        await safePlay();
      }
      return;
    }

    if (audioRef.current && audioRef.current.currentTime > 3) {
      seek(0);
      return;
    }

    const idx = queueRef.current.findIndex((t) => t.id === curr.id);
    if (idx > 0) {
      await playTrack(queueRef.current[idx - 1]);
    } else {
      seek(0);
    }
  }, [playTrack, seek, safePlay]);

  const updateAvailableDevices = useCallback(async () => {
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.enumerateDevices
    ) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, index) => ({
            deviceId: d.deviceId,
            label:
              d.label ||
              (index === 0
                ? "Default Speakers / Output"
                : `Speaker / Headphones ${index + 1}`),
          }));
        setAvailableDevices(audioOutputs);
      } catch (err) {
        console.error("Device enumeration error:", err);
      }
    }
  }, []);

  const setAudioOutputDevice = async (deviceId: string) => {
    if (audioRef.current && "setSinkId" in audioRef.current) {
      try {
        await (audioRef.current as any).setSinkId(deviceId);
        setCurrentDeviceId(deviceId);
      } catch (err) {
        console.error("Failed to switch audio output device:", err);
      }
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);

    const handleEnded = async () => {
      if (repeatModeRef.current === "one") {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
          await safePlay();
        }
        return;
      }

      const q = queueRef.current;
      const curr = currentTrackRef.current;
      if (!curr || q.length === 0) {
        setIsPlaying(false);
        return;
      }

      if (isShuffleRef.current && q.length > 1) {
        const remaining = q.filter((t) => t.id !== curr.id);
        const randomTrack =
          remaining[Math.floor(Math.random() * remaining.length)];
        await playTrack(randomTrack);
        return;
      }

      const idx = q.findIndex((t) => t.id === curr.id);
      if (idx !== -1 && idx + 1 < q.length) {
        await playTrack(q[idx + 1]);
      } else if (repeatModeRef.current === "all" && q.length > 0) {
        await playTrack(q[0]);
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    updateAvailableDevices();
    navigator.mediaDevices?.addEventListener?.(
      "devicechange",
      updateAvailableDevices
    );

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      navigator.mediaDevices?.removeEventListener?.(
        "devicechange",
        updateAvailableDevices
      );
    };
  }, [playTrack, safePlay, updateAvailableDevices]);

  // Hardware Media Session API
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: "Tune-fy",
      artwork: [
        {
          src: currentTrack.coverUrl,
          sizes: "512x512",
          type: "image/jpeg",
        },
      ],
    });

    navigator.mediaSession.setActionHandler("play", () => {
      if (audioRef.current && !isPlayingRef.current) togglePlay();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (audioRef.current && isPlayingRef.current) togglePlay();
    });
    navigator.mediaSession.setActionHandler("previoustrack", () =>
      prevTrack()
    );
    navigator.mediaSession.setActionHandler("nexttrack", () =>
      nextTrack()
    );
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (audioRef.current) seek(audioRef.current.currentTime - 5);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (audioRef.current) seek(audioRef.current.currentTime + 5);
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [currentTrack, togglePlay, prevTrack, nextTrack, seek]);

  // Keyboard Shortcuts (F8, F9, F10, Space, Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "F8" || e.code === "F8") {
        e.preventDefault();
        prevTrack();
      } else if (e.key === "F9" || e.code === "F9") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "F10" || e.code === "F10") {
        e.preventDefault();
        nextTrack();
      } else if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (audioRef.current) seek(audioRef.current.currentTime + 5);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (audioRef.current) seek(audioRef.current.currentTime - 5);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        setVolume(volumeRef.current + 0.05);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        setVolume(volumeRef.current - 0.05);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, prevTrack, nextTrack, seek, setVolume]);

  useEffect(() => {
    const fetchLikedTracks = async () => {
      try {
        const res = await axios.get("https://tunefy-backend.onrender.com/api/liked");
        setLikedTrackIds(res.data);
      } catch {
        setLikedTrackIds([]);
      }
    };
    fetchLikedTracks();
  }, [user]);

  const toggleShuffle = () => setIsShuffle((prev) => !prev);

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === "off") return "all";
      if (prev === "all") return "one";
      return "off";
    });
  };

  const toggleLyrics = () => {
    setIsLyricsOpen((prev) => !prev);
    if (!isLyricsOpen) {
      setIsQueueOpen(false);
      setIsDevicesOpen(false);
    }
  };

  const toggleQueue = () => {
    setIsQueueOpen((prev) => !prev);
    if (!isQueueOpen) {
      setIsLyricsOpen(false);
      setIsDevicesOpen(false);
    }
  };

  const toggleNowPlaying = () => setIsNowPlayingOpen((prev) => !prev);
  const closeNowPlaying = () => setIsNowPlayingOpen(false);

  const toggleDevices = () => {
    setIsDevicesOpen((prev) => !prev);
    updateAvailableDevices();
  };

  const closeDevices = () => setIsDevicesOpen(false);

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    if (currentTrack) {
      setQueue([currentTrack]);
    } else {
      setQueue([]);
    }
  };

  const toggleLike = async (trackId: string) => {
    try {
      const res = await axios.post(
        `https://tunefy-backend.onrender.com/api/liked/${trackId}`
      );
      if (res.data.status === "liked") {
        setLikedTrackIds((prev) => [...prev, trackId]);
      } else {
        setLikedTrackIds((prev) => prev.filter((id) => id !== trackId));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const updateTrackBio = (trackId: string, newBio: string) => {
    if (currentTrack && currentTrack.id === trackId) {
      setCurrentTrack((prev) =>
        prev ? { ...prev, artistBio: newBio } : prev
      );
    }
    setQueue((prevQueue) =>
      prevQueue.map((t) =>
        t.id === trackId ? { ...t, artistBio: newBio } : t
      )
    );
  };

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        likedTrackIds,
        queue,
        isShuffle,
        repeatMode,
        isLyricsOpen,
        isQueueOpen,
        isNowPlayingOpen,
        isDevicesOpen,
        availableDevices,
        currentDeviceId,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        changeVolume: setVolume,
        toggleShuffle,
        toggleRepeat,
        toggleLyrics,
        toggleQueue,
        toggleNowPlaying,
        closeNowPlaying,
        toggleDevices,
        closeDevices,
        setAudioOutputDevice,
        removeFromQueue,
        clearQueue,
        toggleLike,
        updateTrackBio,
        reorderQueue,
        shuffleQueue,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudio must be used inside an AudioProvider");
  }
  return context;
}