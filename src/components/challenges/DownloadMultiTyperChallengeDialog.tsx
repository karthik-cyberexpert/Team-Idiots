"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { Challenge } from "@/types/challenge";
import { Download } from "lucide-react";

interface MultiTyperChallengeDownloadData {
  challenge_title: string;
  challenge_description?: string | null;
  xp_reward: number;
  game_points_reward: number;
  max_time_seconds: number | null;
  texts: { header: string; code: string }[];
}

const fetchMultiTyperChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title")
    .eq("challenge_type", "typer_multi_text_timed")
    .eq("is_active", true); // Only show active ones for download
  if (error) throw new Error(error.message);
  return data;
};

const getMultiTyperChallengeDetails = async (challengeId: string): Promise<MultiTyperChallengeDownloadData> => {
  const { data, error } = await supabase.functions.invoke("get-multi-typer-challenge-details", {
    body: { challenge_id: challengeId },
  });
  if (error) {
    throw new Error(`Failed to fetch challenge details: ${error.message}`);
  }
  if (data && data.error) {
    throw new Error(`Failed to fetch challenge details: ${data.error}`);
  }
  return data as MultiTyperChallengeDownloadData;
};

interface DownloadMultiTyperChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DownloadMultiTyperChallengeDialog = ({ open, onOpenChange }: DownloadMultiTyperChallengeDialogProps) => {
  const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);

  const { data: challenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ["multiTyperChallengesForDownload"],
    queryFn: fetchMultiTyperChallenges,
    enabled: open, // Only fetch when dialog is open
  });

  const downloadMutation = useMutation({
    mutationFn: getMultiTyperChallengeDetails,
    onSuccess: (data, variables) => {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.challenge_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_multi_typer_challenge.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("Challenge JSON downloaded successfully!");
      onOpenChange(false);
      setSelectedChallengeId(null);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  React.useEffect(() => {
    if (!open) {
      setSelectedChallengeId(null); // Reset selection when dialog closes
    }
  }, [open]);

  const handleDownload = () => {
    if (selectedChallengeId) {
      downloadMutation.mutate(selectedChallengeId);
    } else {
      showError("Please select a challenge to download.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Download Multi-Text Typer Challenge</DialogTitle>
          <DialogDescription>
            Select an existing multi-text typer challenge to download its JSON configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select onValueChange={setSelectedChallengeId} value={selectedChallengeId || ""}>
            <SelectTrigger>
              <SelectValue placeholder="Select a challenge" />
            </SelectTrigger>
            <SelectContent>
              {challengesLoading ? (
                <SelectItem value="loading" disabled>Loading challenges...</SelectItem>
              ) : challenges && challenges.length > 0 ? (
                challenges.map((challenge) => (
                  <SelectItem key={challenge.id} value={challenge.id}>
                    {challenge.title}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-challenges" disabled>No multi-text challenges found.</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={!selectedChallengeId || downloadMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {downloadMutation.isPending ? "Downloading..." : "Download JSON"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};