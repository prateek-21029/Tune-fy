"use client";

import React, { useRef, useEffect } from "react";
import { Laptop2, Check, Speaker, Headphones } from "lucide-react";
import { useAudio } from "../context/AudioContext";

export default function ConnectedDevicesModal() {
  const { isDevicesOpen, closeDevices, availableDevices, currentDeviceId, setAudioOutputDevice } = useAudio();
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeDevices();
      }
    };
    if (isDevicesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDevicesOpen, closeDevices]);

  if (!isDevicesOpen) return null;

  return (
    <div
      ref={modalRef}
      className="fixed bottom-24 right-20 z-50 w-72 bg-[#282828] border border-neutral-700/80 rounded-xl p-4 shadow-2xl text-white select-none animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center gap-2 mb-3">
        <Laptop2 className="w-5 h-5 text-[#3b82f6]" />
        <h4 className="text-sm font-bold">Connect to a device</h4>
      </div>

      <p className="text-[11px] text-neutral-400 mb-3">
        Select where your audio plays (Speakers, Headphones, or Bluetooth):
      </p>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {availableDevices.length === 0 ? (
          <div className="p-2.5 rounded-lg bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Speaker className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-xs font-medium">This Computer</span>
            </div>
            <Check className="w-4 h-4 text-[#3b82f6]" />
          </div>
        ) : (
          availableDevices.map((dev) => {
            const isSelected = currentDeviceId === dev.deviceId || (currentDeviceId === "default" && dev.deviceId === "");
            const isHeadphone = dev.label.toLowerCase().includes("headphone") || dev.label.toLowerCase().includes("earphone");

            return (
              <button
                key={dev.deviceId || dev.label}
                onClick={() => setAudioOutputDevice(dev.deviceId)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-medium transition ${
                  isSelected ? "bg-white/10 text-[#3b82f6]" : "hover:bg-white/5 text-neutral-200"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  {isHeadphone ? (
                    <Headphones className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-[#3b82f6]" : "text-neutral-400"}`} />
                  ) : (
                    <Speaker className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-[#3b82f6]" : "text-neutral-400"}`} />
                  )}
                  <span className="truncate">{dev.label || "System Audio Output"}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#3b82f6] flex-shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}