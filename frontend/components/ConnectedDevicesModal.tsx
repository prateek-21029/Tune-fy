"use client";

import React, { useRef, useEffect } from "react";
import { Laptop2, Check, Speaker, Headphones, X } from "lucide-react";
import { useAudio } from "../context/AudioContext";
import { useTheme } from "../context/ThemeContext";

export default function ConnectedDevicesModal() {
  const {
    isDevicesOpen,
    closeDevices,
    availableDevices,
    currentDeviceId,
    setAudioOutputDevice,
  } = useAudio();
  const { currentTheme } = useTheme();
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
    <>
      {/* Mobile backdrop */}
      <div
        onClick={closeDevices}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-in fade-in duration-200"
      />

      {/* Modal element */}
      <div
        ref={modalRef}
        className="fixed inset-x-4 bottom-20 md:inset-x-auto md:bottom-24 md:right-16 z-60 w-auto md:w-80 bg-[#282828] border border-neutral-700/80 rounded-2xl p-4 shadow-2xl text-white select-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Laptop2 className="w-5 h-5" style={{ color: currentTheme.primary }} />
            <h4 className="text-sm font-bold">Connect to a device</h4>
          </div>
          <button
            onClick={closeDevices}
            className="p-1 rounded-full text-neutral-400 hover:text-white md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 mb-3">
          Select where your audio plays (Speakers, Headphones, or Bluetooth):
        </p>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
          {availableDevices.length === 0 ? (
            <div className="p-2.5 rounded-lg bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Speaker
                  className="w-4 h-4"
                  style={{ color: currentTheme.primary }}
                />
                <span className="text-xs font-medium">This Device / Default</span>
              </div>
              <Check className="w-4 h-4" style={{ color: currentTheme.primary }} />
            </div>
          ) : (
            availableDevices.map((dev) => {
              const isSelected =
                currentDeviceId === dev.deviceId ||
                (currentDeviceId === "default" && dev.deviceId === "");
              const isHeadphone =
                dev.label.toLowerCase().includes("headphone") ||
                dev.label.toLowerCase().includes("earphone");

              return (
                <button
                  key={dev.deviceId || dev.label}
                  onClick={() => setAudioOutputDevice(dev.deviceId)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-medium transition ${
                    isSelected
                      ? "bg-white/10"
                      : "hover:bg-white/5 text-neutral-200"
                  }`}
                  style={{
                    color: isSelected ? currentTheme.primary : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    {isHeadphone ? (
                      <Headphones
                        className="w-4 h-4 flex-shrink-0"
                        style={{
                          color: isSelected
                            ? currentTheme.primary
                            : "#a3a3a3",
                        }}
                      />
                    ) : (
                      <Speaker
                        className="w-4 h-4 flex-shrink-0"
                        style={{
                          color: isSelected
                            ? currentTheme.primary
                            : "#a3a3a3",
                        }}
                      />
                    )}
                    <span className="truncate">
                      {dev.label || "System Audio Output"}
                    </span>
                  </div>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: currentTheme.primary }}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}