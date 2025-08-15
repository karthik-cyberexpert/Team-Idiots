"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError } from "@/utils/toast";
import { useNavigate } from "react-router-dom";

interface CreateLudoGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateLudoGameDialog = ({ open, onOpenChange }: CreateLudoGameDialogProps) => {
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-ludo-session");
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      onOpenChange(false);
      navigate(`/dashboard/fun-space/ludo/${data.id}`);
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Ludo Game</DialogTitle>
          <DialogDescription>
            Create a new Ludo game session. You will be the host.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-muted-foreground">
            A new game will be created, and you'll receive a join code to share with friends.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Game"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};