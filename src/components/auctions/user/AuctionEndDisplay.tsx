"use client";

import * as React from "react";
import Confetti from 'react-dom-confetti';
import { PartyPopper, Frown } from "lucide-react";

interface AuctionEndDisplayProps {
  isWinner: boolean;
  winnerName: string | null;
  winningBid: number;
}

export const AuctionEndDisplay = ({ isWinner, winnerName, winningBid }: AuctionEndDisplayProps) => {
  const [confettiActive, setConfettiActive] = React.useState(false);

  React.useEffect(() => {
    if (isWinner) {
      const timer = setTimeout(() => setConfettiActive(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isWinner]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center p-4 bg-card rounded-lg overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Confetti active={confettiActive} config={{
          angle: 90,
          spread: 360,
          startVelocity: 40,
          elementCount: 100,
          duration: 3000,
        }} />
      </div>
      {isWinner ? (
        <>
          <PartyPopper className="h-12 w-12 text-vibrant-gold" />
          <h3 className="text-xl font-bold mt-2 text-vibrant-gold">Congratulations!</h3>
          <p className="text-muted-foreground">You won with a bid of {winningBid} GP!</p>
        </>
      ) : (
        <>
          <Frown className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-bold mt-2">Auction Ended</h3>
          {winnerName ? (
            <p className="text-muted-foreground">
              <span className="font-semibold">{winnerName}</span> won with a bid of {winningBid} GP.
            </p>
          ) : (
            <p className="text-muted-foreground">The item was not sold.</p>
          )}
          <p className="text-sm text-muted-foreground/80 mt-1">Better luck next time!</p>
        </>
      )}
    </div>
  );
};