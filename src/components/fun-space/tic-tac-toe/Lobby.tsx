"use client";

import { Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

interface LobbyProps {
  joinCode: string;
}

export const Lobby = ({ joinCode }: LobbyProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    showSuccess("Code copied to clipboard!");
  };

  return (
    <div className="text-center space-y-4 p-8">
      <h2 className="text-xl font-semibold">Waiting for Opponent...</h2>
      <p className="text-muted-foreground">Share this code with a friend to have them join:</p>
      <div className="flex items-center justify-center gap-2">
        <p className="text-4xl font-bold tracking-widest bg-muted p-4 rounded-md">{joinCode}</p>
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          <Copy className="h-6 w-6" />
        </Button>
      </div>
      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
    </div>
  );
};