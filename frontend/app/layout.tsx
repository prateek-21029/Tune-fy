import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../context/AuthContext";
import { AudioProvider } from "../context/AudioContext";
import { ThemeProvider } from "../context/ThemeContext";
import ConnectedDevicesModal from "../components/ConnectedDevicesModal";
import Sidebar from "../components/Sidebar";
import PlayerBar from "../components/PlayerBar";
import MobileNav from "../components/MobileNav";
import NowPlayingPanel from "../components/NowPlayingPanel";
import QueueDrawer from "../components/QueuePanel";
import LyricsModal from "../components/LyricsModal";
import AuthModal from "../components/AuthModal";
import ProfileModal from "../components/ProfileModal";

export const metadata: Metadata = {
  title: "Tune-fy - Web Player",
  description: "Spotify-inspired streaming and music library platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased overflow-hidden selection:bg-[#3b82f6]/30 select-none">
        <AuthProvider>
          <ThemeProvider>
            <AudioProvider>
              {/* Global App Layout Container */}
              <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
                {/* Left Sidebar (Hidden on mobile) */}
                <Sidebar />

                {/* Main Content Area: pb-36 on mobile to clear mini-player + bottom nav */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-36 md:pb-20 relative">
                  {children}
                </main>

                {/* Right Side Panels (Collapsible via PlayerBar controls) */}
                <NowPlayingPanel />
                <QueueDrawer />
              </div>

              {/* Overlays & Modals */}
              <LyricsModal />
              <ConnectedDevicesModal />
              <AuthModal />
              <ProfileModal />

              {/* Bottom Sticky Player Bar & Mobile Bottom Navigation */}
              <PlayerBar />
              <MobileNav />
            </AudioProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}