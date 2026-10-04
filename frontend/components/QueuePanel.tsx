"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  Trash2,
  Shuffle,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useTheme } from "../context/ThemeContext";

export default function QueueDrawer() {
  const {
    isQueueOpen,
    toggleQueue,
    queue,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    shuffleQueue,
  } = useAudio() as any;

  const { currentTheme } = useTheme();
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  if (!isQueueOpen) return null;

  const upcomingTracks = queue.filter((t: any) => t.id !== currentTrack?.id);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
    setDraggedIdx(originalIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    if (typeof reorderQueue === "function") {
      reorderQueue(draggedIdx, targetIndex);
    }
    setDraggedIdx(null);
  };

  const handleMoveUp = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index > 0 && typeof reorderQueue === "function") {
      reorderQueue(index, index - 1);
    }
  };

  const handleMoveDown = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index < queue.length - 1 && typeof reorderQueue === "function") {
      reorderQueue(index, index + 1);
    }
  };

  return (
    <aside className="w-80 h-full bg-[#121212] border-l border-neutral-800 flex flex-col select-none overflow-hidden p-4 flex-shrink-0 z-30 animate-in slide-in-from-right duration-200">
      {/* Header with Title, Shuffle, Clear, and Close */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm text-white">Queue</h3>
        <div className="flex items-center gap-2">
          {upcomingTracks.length > 1 && (
            <>
              <button
                onClick={shuffleQueue}
                className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition px-2 py-0.5 rounded bg-white/5 hover:bg-white/10"
                title="Shuffle Upcoming Queue"
              >
                <Shuffle className="w-3 h-3" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={clearQueue}
                className="text-[11px] text-neutral-400 hover:text-white transition px-1.5 py-0.5"
                title="Clear queue"
              >
                Clear
              </button>
            </>
          )}

          <button
            onClick={toggleQueue}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Close queue"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Currently Playing Track */}
        {currentTrack && (
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
              Now Playing
            </span>
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/10 shadow-sm">
              <img
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
              />
              <div className="overflow-hidden flex-1">
                <p
                  className="text-xs font-bold truncate"
                  style={{ color: currentTheme.primary }}
                >
                  {currentTrack.title}
                </p>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {currentTrack.artist}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Up Next List with Drag, Reorder, and Removal */}
        <div>
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
            Next In Queue ({upcomingTracks.length})
          </span>

          {upcomingTracks.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-neutral-800 rounded-lg">
              <p className="text-xs text-neutral-500">No more tracks in queue.</p>
              <p className="text-[10px] text-neutral-600 mt-1">
                Play a playlist or track to queue more songs.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((track: any, idx: number) => {
                // Skip the currently playing item from "Next In Queue"
                if (track.id === currentTrack?.id) return null;

                const isDragged = draggedIdx === idx;

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => playTrack(track)}
                    className={`flex items-center justify-between p-2 rounded-md hover:bg-white/5 transition group cursor-pointer border ${
                      isDragged
                        ? "opacity-40 border-blue-500 bg-white/10"
                        : "border-transparent"
                    }`}
                  >
                    {/* Drag Handle & Info */}
                    <div className="flex items-center gap-2 overflow-hidden flex-1 pr-2">
                      <div
                        className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-white p-0.5"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-9 h-9 rounded object-cover flex-shrink-0"
                      />

                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-medium text-white truncate group-hover:text-blue-400">
                          {track.title}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {track.artist}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Move Up/Down, Play, Delete */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => handleMoveUp(e, idx)}
                        disabled={idx === 0}
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleMoveDown(e, idx)}
                        disabled={idx === queue.length - 1}
                        className="p-1 text-neutral-400 hover:text-white disabled:opacity-20"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playTrack(track);
                        }}
                        className="p-1 text-white hover:text-blue-400"
                        title="Play Now"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof removeFromQueue === "function") {
                            removeFromQueue(idx);
                          }
                        }}
                        className="p-1 text-neutral-400 hover:text-red-400"
                        title="Remove from queue"
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
    </aside>
  );
}