"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { X, Music } from "lucide-react";
import { useAudio } from "../context/AudioContext";

interface LyricLine {
  time: number;
  text: string;
}

function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();
      if (text) {
        result.push({ time, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export default function LyricsModal() {
  const { currentTrack, currentTime, isLyricsOpen, toggleLyrics, seek } = useAudio();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [plainLyrics, setPlainLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    let isMounted = true;
    const fetchLyrics = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:8000/api/lyrics", {
          params: { title: currentTrack.title, artist: currentTrack.artist },
        });
        if (isMounted) {
          if (res.data.syncedLyrics) {
            setLyrics(parseLrc(res.data.syncedLyrics));
            setPlainLyrics(null);
          } else if (res.data.plainLyrics) {
            setPlainLyrics(res.data.plainLyrics);
            setLyrics([]);
          }
        }
      } catch {
        if (isMounted) {
          setLyrics([]);
          setPlainLyrics(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyrics();
    return () => {
      isMounted = false;
    };
  }, [currentTrack?.id, isLyricsOpen]);

  // Determine current active lyric index
  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, currentTime]);

  // Smooth auto-scroll active lyric into center view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex]);

  if (!isLyricsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col p-8 select-none">
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Music className="w-5 h-5 text-[#3b82f6]" />
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {currentTrack?.title || "Lyrics"}
            </h2>
            <p className="text-xs text-neutral-400">{currentTrack?.artist}</p>
          </div>
        </div>
        <button
          onClick={toggleLyrics}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          title="Close lyrics"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 text-center space-y-6 py-20"
      >
        {loading ? (
          <p className="text-neutral-400 animate-pulse text-sm">Searching for lyrics...</p>
        ) : lyrics.length > 0 ? (
          lyrics.map((line, idx) => {
            const isActive = idx === activeIndex;
            return (
              <p
                key={idx}
                ref={isActive ? activeLineRef : null}
                onClick={() => seek(line.time)}
                className={`text-2xl md:text-3xl font-extrabold cursor-pointer transition-all duration-300 ${
                  isActive
                    ? "text-[#3b82f6] scale-105"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {line.text}
              </p>
            );
          })
        ) : plainLyrics ? (
          <div className="text-lg text-neutral-300 leading-loose whitespace-pre-line font-medium">
            {plainLyrics}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">Couldn't find lyrics for this song.</p>
        )}
      </div>
    </div>
  );
}