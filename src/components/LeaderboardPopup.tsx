"use client";

import React, { useEffect, useState } from 'react';
import Confetti from 'react-dom-confetti';

interface LeaderboardPopupProps {
  position: number;
  onClose: () => void;
}

export const LeaderboardPopup: React.FC<LeaderboardPopupProps> = ({ position, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    // Activate confetti shortly after the component mounts to ensure it's visible
    const confettiTimer = setTimeout(() => setConfettiActive(true), 100);

    // Set a timer to close the popup after 1 second (confetti duration) + 0.5 seconds (fade-out)
    const closeTimer = setTimeout(() => {
      setVisible(false);
      setConfettiActive(false);
      // Allow fade-out animation to complete before calling onClose
      setTimeout(onClose, 500);
    }, 1500); // 1000ms (confetti) + 500ms (fade-out)

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  const getPositionSuffix = (pos: number) => {
    if (pos % 100 >= 11 && pos % 100 <= 13) {
      return 'th';
    }
    switch (pos % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 200,
    dragFriction: 0.12,
    duration: 1000, // Changed to 1 second
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Position the confetti to explode from the center of the screen */}
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]">
          <Confetti active={confettiActive} config={confettiConfig} />
        </div>
        <div className="text-center text-white p-8 rounded-lg bg-background/80 backdrop-blur-sm animate-in fade-in-0 zoom-in-95">
          <h2 className="text-4xl md:text-6xl font-bold mb-4 animate-bounce">
            Congratulations! 🎉
          </h2>
          <p className="text-2xl md:text-3xl">
            You are the <span className="font-bold text-vibrant-gold">{position}{getPositionSuffix(position)}</span> position in the leaderboard!
          </p>
        </div>
      </div>
    </>
  );
};