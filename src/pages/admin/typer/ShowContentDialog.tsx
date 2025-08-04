"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TyperSet, TypingText } from "@/types/typer";

interface ShowContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typerSet: TyperSet | null;
}

export const ShowContentDialog = ({ open, onOpenChange, typerSet }: ShowContentDialogProps) => {
  if (!typerSet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Content for: {typerSet.title}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Carousel className="w-full">
            <CarouselContent>
              {typerSet.typing_texts.map((text, index) => (
                <CarouselItem key={text.id}>
                  <div className="p-1">
                    <Card>
                      <CardHeader>
                        <CardTitle>{text.title} (Text {index + 1} of 7)</CardTitle>
                      </CardHeader>
                      <CardContent className="font-mono p-4 bg-muted rounded-md whitespace-pre-wrap text-sm">
                        {text.content}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
};