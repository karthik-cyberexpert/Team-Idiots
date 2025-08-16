"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Content for: {typerSet.title}</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          {/* Main scroll area for the list of texts */}
          <ScrollArea className="h-[600px] w-full rounded-md border">
            <div className="p-4"> {/* Inner padding for the scroll area content */}
              {typerSet.typing_texts.map((text, index) => (
                <Card key={text.id} className="mb-4 h-[250px] flex flex-col"> {/* Fixed height for each card */}
                  <CardHeader className="pb-2"> {/* Reduced padding */}
                    <CardTitle className="text-lg">{text.title} (Text {index + 1} of 35)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 flex-grow">
                    {/* ScrollArea for individual text content */}
                    <ScrollArea className="w-full h-full rounded-md bg-muted">
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
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};