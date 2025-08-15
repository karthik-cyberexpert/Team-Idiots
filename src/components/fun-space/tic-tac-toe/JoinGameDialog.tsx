"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

const joinGameSession = async (joinCode: string) => {
  const { data, error } = await supabase.functions.invoke("join-game-session", { body: { joinCode } });
  if (error) throw new Error(error.message);
  return data;
};

interface JoinGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinGameDialog = ({ open, onOpenChange }: JoinGameDialogProps) => {
  const navigate = useNavigate();
  const [code, setCode] = React.useState("");

  const mutation = useMutation({
    mutationFn: joinGameSession,
    onSuccess: (data) => {
      onOpenChange(false);
      navigate(`/dashboard/fun-space/tic-tac-toe/${data.id}`);
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleJoin = () => {
    if (code.length === 6) {
      mutation.mutate(code);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Game</DialogTitle>
          <DialogDescription>Enter the 6-digit code from your friend to join their game.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleJoin} disabled={code.length < 6 || mutation.isPending}>
            {mutation.isPending ? "Joining..." : "Join Game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};