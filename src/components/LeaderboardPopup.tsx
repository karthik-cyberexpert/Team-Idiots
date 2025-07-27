"use client";

import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';

interface LeaderboardPopupProps {
  position: number;
  onClose: () => void;
}

export const LeaderboardPopup: React.FC<LeaderboardPopupProps> = ({ position, onClose }) => {
  const { width, height } = useWindowSize();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Allow fade-out animation to complete before calling onClose
      setTimeout(onClose, 500);
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
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

  return (
    <>
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={visible ? 400 : 0}
        gravity={0.2}
      />
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
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