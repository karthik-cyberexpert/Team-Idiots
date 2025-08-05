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
import * as prismStyles from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ShowContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typerSet: TyperSet | null;
}

export const ShowContentDialog = ({ open, onOpenChange, typerSet }: ShowContentDialogProps) => {
  if (!typerSet) return null;

  const atomOneDark = prismStyles.atomOneDark;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl"> {/* Changed max-w-3xl to max-w-5xl */}
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
                            language="javascript"
                            style={atomOneDark}
                            showLineNumbers={true}
                            wrapLines={true}
                            customStyle={{
                              backgroundColor: 'transparent',
                              padding: '1rem',
                              fontSize: '0.875rem',
                              fontFamily: 'var(--font-mono)',
                              margin: 0,
                            }}
                            lineNumberStyle={{
                              color: '#666',
                              minWidth: '2.5em',
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