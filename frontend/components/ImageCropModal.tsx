"use client";

import React, { useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, Check } from "lucide-react";
import  getCroppedImg  from "../utils/cropImage";

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !imageSrc) return null;

  const handleCropComplete = (_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
    if (croppedBlob) {
      const croppedFile = new File([croppedBlob], "cropped-cover.jpg", {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onCropComplete(croppedFile);
      onClose();
    }
    } catch (err) {
      console.error("Failed to crop image:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 select-none">
      <div className="bg-[#282828] w-full max-w-lg rounded-xl shadow-2xl p-6 relative border border-neutral-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-700">
          <h2 className="text-lg font-bold text-white">Edit Playlist Cover</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="relative w-full h-80 my-4 bg-black rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-3 px-2 mb-6 text-neutral-400">
          <ZoomIn className="w-4 h-4" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1.5 accent-[#1db954] bg-neutral-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-2 bg-[#1db954] text-black rounded-full font-bold text-xs hover:scale-105 active:scale-95 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? "Saving..." : "Save Cover"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}