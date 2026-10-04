"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import { X, Camera, Check, ZoomIn, RotateCcw, HelpCircle, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import getCroppedImg, { Area } from "../utils/cropImage";

const PRESET_QUESTIONS = [
  "What is your favorite bike or car model?",
  "What was the name of your first school?",
  "What is your favorite childhood food?",
  "What city were you born in?",
  "Custom question (write your own)",
];

export default function ProfileModal() {
  const { isProfileModalOpen, closeProfileModal, user, updateUser, token } = useAuth() as any;

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Easy-crop states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user && isProfileModalOpen) {
      setDisplayName(user.displayName || user.username || "");
      setUsername(user.username || "");
      setSecurityAnswer("");

      // Fetch user's latest security question from backend
      const fetchCurrentProfile = async () => {
        try {
          const activeToken = token || localStorage.getItem("token");
          const res = await axios.get("http://localhost:8000/api/auth/me", {
            headers: { Authorization: `Bearer ${activeToken}` },
          });
          const q = res.data.securityQuestion;
          if (q) {
            if (PRESET_QUESTIONS.includes(q)) {
              setSelectedQuestion(q);
            } else {
              setSelectedQuestion("Custom question (write your own)");
              setCustomQuestion(q);
            }
          }
        } catch (err) {
          console.error("Failed to load profile details:", err);
        }
      };

      fetchCurrentProfile();
    }
  }, [user, isProfileModalOpen, token]);

  if (!isProfileModalOpen || !user) return null;

  const activeName = (displayName || user.displayName || user.username || "User").trim() || "User";
  const initial = activeName.charAt(0).toUpperCase();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawImageSrc(reader.result as string);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) return;

    setIsSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    const finalQuestion =
      selectedQuestion === "Custom question (write your own)"
        ? customQuestion.trim()
        : selectedQuestion;

    try {
      const activeToken = token || localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${activeToken}` };

      // 1. Update text fields and security question/answer
      const payload: Record<string, string> = {
        displayName: displayName.trim(),
        username: username.trim(),
      };
      if (finalQuestion) {
        payload.security_question = finalQuestion;
      }
      if (securityAnswer.trim()) {
        payload.security_answer = securityAnswer.trim();
      }

      const res = await axios.patch("http://localhost:8000/api/auth/profile", payload, { headers });
      if (typeof updateUser === "function") {
        updateUser(res.data);
      }

      // 2. Crop & upload circular avatar if user selected a file
      if (rawImageSrc && croppedAreaPixels) {
        const croppedBlob = await getCroppedImg(rawImageSrc, croppedAreaPixels, true);
        if (croppedBlob) {
          const formData = new FormData();
          formData.append("file", croppedBlob, "avatar.png");
          const avatarRes = await axios.post("http://localhost:8000/api/auth/avatar", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${activeToken}`,
            },
          });
          if (typeof updateUser === "function") {
            updateUser({ avatarUrl: avatarRes.data.avatarUrl });
          }
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setRawImageSrc(null);
        closeProfileModal();
      }, 700);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === "string" ? detail : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-[#282828] border border-neutral-700 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => {
            setRawImageSrc(null);
            closeProfileModal();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Profile details</h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-center font-medium">
            {errorMessage}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
          {/* Avatar Preview / Easy-Cropper Container */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-36 h-36 rounded-full overflow-hidden bg-neutral-800 shadow-xl flex-shrink-0 border-2 border-neutral-600">
              {rawImageSrc ? (
                <Cropper
                  image={rawImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              ) : user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={activeName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#1db954] flex items-center justify-center text-4xl font-extrabold text-black">
                  {initial}
                </div>
              )}

              {!rawImageSrc && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                  <span className="text-[11px] font-bold text-white">Choose photo</span>
                </div>
              )}
            </div>

            {rawImageSrc && (
              <div className="flex items-center gap-2 w-36">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-[#1db954]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                  }}
                  className="p-1 hover:text-[#1db954] text-neutral-400 transition"
                  title="Reset position"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* User Fields */}
          <form onSubmit={handleSubmit} className="flex-1 w-full space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="w-full bg-[#3e3e3e] text-white text-xs px-3 py-2.5 rounded-md border border-transparent focus:border-[#1db954] outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-[#3e3e3e] text-white text-xs px-3 py-2.5 rounded-md border border-transparent focus:border-[#1db954] outline-none transition"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Email
              </label>
              <input
                type="text"
                disabled
                value={user.email}
                className="w-full bg-[#1e1e1e] text-neutral-500 text-xs px-3 py-2 rounded-md border border-neutral-800 cursor-not-allowed"
              />
            </div>

            {/* Security Question Section */}
            <div className="pt-2 border-t border-neutral-700/60">
              <label className="text-[11px] font-bold text-[#1db954] uppercase tracking-wider block mb-1">
                Security Question (Account Recovery)
              </label>
              <div className="relative">
                <HelpCircle className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full bg-[#3e3e3e] text-white text-xs pl-9 pr-3 py-2.5 rounded-md border border-transparent focus:border-[#1db954] outline-none transition appearance-none cursor-pointer"
                >
                  {PRESET_QUESTIONS.map((q) => (
                    <option key={q} value={q} className="bg-[#282828] text-white">
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedQuestion === "Custom question (write your own)" && (
              <div>
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Type your custom security question..."
                  className="w-full bg-[#3e3e3e] text-white text-xs px-3 py-2 rounded-md border border-transparent focus:border-[#1db954] outline-none transition"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                New Security Answer (Leave blank to keep existing)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Type new answer to update"
                  className="w-full bg-[#3e3e3e] text-white text-xs pl-9 pr-3 py-2.5 rounded-md border border-transparent focus:border-[#1db954] outline-none transition"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-xs rounded-full transition"
              >
                Change Photo
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full transition shadow-md flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Saved!</span>
                  </>
                ) : isSaving ? (
                  "Saving..."
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}