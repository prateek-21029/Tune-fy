"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  X,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PRESET_QUESTIONS = [
  "What is your favorite bike or car model?",
  "What was the name of your first school?",
  "What is your favorite childhood food?",
  "What city were you born in?",
  "Custom question (write your own)",
];

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth();

  // Mode: "login" | "register" | "forgot"
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

  // Form Fields
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Security Question (Registration)
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");

  // Forgot Password Flow
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [retrievedQuestion, setRetrievedQuestion] = useState("");
  const [resetAnswer, setResetAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const parseErrorMessage = (err: any): string => {
    const detail = err.response?.data?.detail;
    if (!detail) return "An error occurred. Please try again.";
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d.msg || "Invalid input").join(", ");
    }
    if (typeof detail === "object") {
      return detail.msg || JSON.stringify(detail);
    }
    return String(detail);
  };

  const resetAllStates = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(false);
    setForgotStep(1);
    setRetrievedQuestion("");
    setResetAnswer("");
    setNewPassword("");
  };

  const handleClose = () => {
    resetAllStates();
    setMode("login");
    closeAuthModal();
  };

  // Main Submit (Login & Register)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      if (mode === "register") {
        if (!email.trim()) {
          setErrorMessage("Email is required.");
          setIsLoading(false);
          return;
        }

        const finalQuestion =
          selectedQuestion === "Custom question (write your own)"
            ? customQuestion.trim()
            : selectedQuestion;

        if (!finalQuestion) {
          setErrorMessage("Please select or write a security question.");
          setIsLoading(false);
          return;
        }

        if (!securityAnswer.trim()) {
          setErrorMessage("Security answer is required for account recovery.");
          setIsLoading(false);
          return;
        }

        await register(
          identifier.trim(),
          email.trim(),
          password,
          finalQuestion,
          securityAnswer.trim()
        );
      } else {
        await login(identifier.trim(), password);
      }

      handleClose();
      setIdentifier("");
      setEmail("");
      setPassword("");
      setSecurityAnswer("");
      setCustomQuestion("");
    } catch (err: any) {
      setErrorMessage(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Look up question by email
  const handleFetchQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please enter your registered email.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/api/auth/security-question", {
        email: email.trim(),
      });
      setRetrievedQuestion(res.data.question);
      setForgotStep(2);
    } catch (err: any) {
      setErrorMessage(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit answer and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetAnswer.trim()) {
      setErrorMessage("Please answer your security question.");
      return;
    }
    if (newPassword.length < 4) {
      setErrorMessage("New password must be at least 4 characters.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      await axios.post("http://localhost:8000/api/auth/reset-password", {
        email: email.trim(),
        security_answer: resetAnswer.trim(),
        new_password: newPassword,
      });

      setSuccessMessage("Password reset successfully! Log in with your new password.");
      setMode("login");
      setForgotStep(1);
      setPassword("");
    } catch (err: any) {
      setErrorMessage(parseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-[#181818] border border-neutral-800 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white">
            {mode === "login"
              ? "Welcome Back"
              : mode === "register"
              ? "Create Account"
              : "Recover Account"}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {mode === "login"
              ? "Log in to access your library and playlists."
              : mode === "register"
              ? "Join Tune-fy to save and customize your music."
              : "Reset your password securely without email verification."}
          </p>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 text-center font-medium flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* --- VIEW 1: LOGIN & REGISTER FORMS --- */}
        {mode !== "forgot" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                {mode === "register" ? "Username" : "Username or Email"}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={mode === "register" ? "Choose a username" : "Enter username or email"}
                  className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                />
              </div>
            </div>

            {mode === "register" && (
              <>
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                  </div>
                </div>

                {/* Security Question Selector */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Security Question (for recovery)
                  </label>
                  <div className="relative">
                    <HelpCircle className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={selectedQuestion}
                      onChange={(e) => setSelectedQuestion(e.target.value)}
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition appearance-none cursor-pointer"
                    >
                      {PRESET_QUESTIONS.map((q) => (
                        <option key={q} value={q} className="bg-[#242424] text-white">
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Custom Question input if selected */}
                {selectedQuestion === "Custom question (write your own)" && (
                  <div>
                    <input
                      type="text"
                      required
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="Type your custom question..."
                      className="w-full bg-[#242424] text-white text-xs px-3 py-2 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                  </div>
                )}

                {/* Security Answer */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Security Answer
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Your secret answer (case-insensitive)"
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      resetAllStates();
                      setMode("forgot");
                    }}
                    className="text-[11px] text-neutral-400 hover:text-white transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-[#242424] text-white text-xs pl-9 pr-10 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full transition shadow-md mt-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? "Please wait..." : mode === "register" ? "Sign Up" : "Log In"}
            </button>
          </form>
        )}

        {/* --- VIEW 2: FORGOT PASSWORD RECOVERY --- */}
        {mode === "forgot" && (
          <div className="space-y-4">
            {forgotStep === 1 ? (
              <form onSubmit={handleFetchQuestion} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full transition shadow-md disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? "Checking..." : "Continue"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Displayed Security Question */}
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-[#1db954] tracking-wider block mb-1">
                    Security Question
                  </span>
                  <p className="text-xs text-white font-medium">{retrievedQuestion}</p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Your Answer
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={resetAnswer}
                      onChange={(e) => setResetAnswer(e.target.value)}
                      placeholder="Type your answer"
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-[#242424] text-white text-xs pl-9 pr-10 py-2.5 rounded-lg border border-neutral-700 focus:border-[#1db954] outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#1db954] hover:bg-[#1ed760] text-black font-extrabold text-xs rounded-full transition shadow-md disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  resetAllStates();
                  setMode("login");
                }}
                className="text-xs text-neutral-400 hover:text-white inline-flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </div>
          </div>
        )}

        {/* Toggle Mode Footer (for Login & Register) */}
        {mode !== "forgot" && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                resetAllStates();
                setMode(mode === "register" ? "login" : "register");
              }}
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              {mode === "register"
                ? "Already have an account? Log In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}