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
import { TyperSet } from "@/types/typer";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShowContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typerSet: TyperSet | null;
}

export const ShowContentDialog = ({ open, onOpenChange, typerSet }: ShowContentDialogProps) => {
  if (!typerSet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
                        <CardTitle>{text.title} (Text {index + 1} of 35)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-72 w-full rounded-md border bg-muted p-4 font-mono text-sm whitespace-pre-wrap">
                          {text.content}
                        </ScrollArea>
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