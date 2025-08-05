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
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Using atomOneDark for good contrast

interface ShowContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typerSet: TyperSet | null;
}

export const ShowContentDialog = ({ open, onOpenChange, typerSet }: ShowContentDialogProps) => {
  if (!typerSet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Content for: {typerSet.title}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Carousel className="w-full">
            <CarouselContent>
              {typerSet.typing_texts.map((text, index) => (
                <CarouselItem key={text.id} className="basis-full">
                  <div className="p-1">
                    <Card className="h-[400px] flex flex-col">
                      <CardHeader>
                        <CardTitle>{text.title} (Text {index + 1} of 35)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 flex-grow">
                        <ScrollArea className="w-full h-full rounded-md border bg-muted">
                          <SyntaxHighlighter
                            language="javascript" // Assuming JavaScript/TypeScript code. Can be made dynamic if text type is added.
                            style={atomOneDark}
                            showLineNumbers={true}
                            wrapLines={true}
                            customStyle={{
                              backgroundColor: 'transparent', // Use parent's background
                              padding: '1rem',
                              fontSize: '0.875rem', // text-sm
                              fontFamily: 'var(--font-mono)', // Use the mono font family
                              margin: 0, // Remove default margin
                            }}
                            lineNumberStyle={{
                              color: '#666', // Lighter color for line numbers
                              minWidth: '2.5em', // Ensure enough space for line numbers
                              paddingRight: '1em',
                              userSelect: 'none',
                            }}
                          >
                            {text.content}
                          </SyntaxHighlighter>
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