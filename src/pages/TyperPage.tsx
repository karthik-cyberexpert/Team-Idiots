"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TypingText } from "@/types/typing-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase
    .from("typing_texts")
    .select("*");
  if (error) throw new Error(error.message);
  return data;
};

const TyperPage = () => {
  const [currentText, setCurrentText] = React.useState<TypingText | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: availableTexts, isLoading, error } = useQuery<TypingText[]>({
    queryKey: ["availableTypingTexts"],
    queryFn: fetchTypingTexts,
  });

  const resetTest = React.useCallback(() => {
    if (availableTexts && availableTexts.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableTexts.length);
      setCurrentText(availableTexts[randomIndex]);
      setInputText("");
      setStartTime(null);
      setEndTime(null);
      setAccuracy(null);
      setWpm(null);
      inputRef.current?.focus();
    } else {
      setCurrentText(null); // No texts available
    }
  }, [availableTexts]);

  React.useEffect(() => {
    if (availableTexts && !currentText) {
      resetTest();
    }
  }, [availableTexts, currentText, resetTest]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentText || endTime) return; // Prevent typing if test is over or no text

    const value = e.target.value;
    setInputText(value);

    if (!startTime) {
      setStartTime(Date.now());
    }

    if (value === currentText.content) {
      setEndTime(Date.now());
      calculateResults();
    }
  };

  const calculateResults = () => {
    if (startTime && endTime && currentText) {
      const durationInMinutes = (endTime - startTime) / 60000;
      const wordsTyped = currentText.content.split(" ").length;
      const calculatedWpm = Math.round(wordsTyped / durationInMinutes);
      setWpm(calculatedWpm);

      let correctChars = 0;
      for (let i = 0; i < inputText.length; i++) {
        if (inputText[i] === currentText.content[i]) {
          correctChars++;
        }
      }
      const calculatedAccuracy = (correctChars / currentText.content.length) * 100;
      setAccuracy(parseFloat(calculatedAccuracy.toFixed(2)));
    }
  };

  const getCharClass = (char: string, index: number) => {
    if (!currentText) return "";
    if (index < inputText.length) {
      return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
    }
    return "text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Typer</h1>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-1/4 ml-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer</h1>
      <p className="text-muted-foreground">Test and improve your typing speed and accuracy by typing code snippets!</p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{currentText ? currentText.title : "No Text Available"}</CardTitle>
          <CardDescription>Type the code below as fast and accurately as you can.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentText ? (
            <div className="relative p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed whitespace-pre-wrap">
              {/* Original text layer */}
              <div className="absolute inset-0 p-4 text-muted-foreground opacity-50">
                {currentText.content}
              </div>
              {/* Typed text layer with coloring */}
              <div className="relative z-10">
                {currentText.content.split("").map((char, index) => (
                  <span key={index} className={cn(getCharClass(char, index))}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed text-center text-muted-foreground">
              No typing texts available. Please ask an admin to add some!
            </div>
          )}
          
          <Textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            placeholder="Start typing here..."
            className="text-lg font-mono"
            rows={8}
            disabled={!!endTime || !currentText}
          />
          <div className="flex justify-end">
            <Button onClick={resetTest} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95" disabled={!availableTexts || availableTexts.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" /> New Text
            </Button>
          </div>

          {endTime && (
            <div className="mt-4 p-4 border rounded-md bg-card flex flex-col sm:flex-row justify-around items-center text-center sm:text-left gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-vibrant-green" />
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold text-vibrant-green">{accuracy}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-vibrant-orange" />
                <div>
                  <p className="text-sm text-muted-foreground">WPM</p>
                  <p className="text-2xl font-bold text-vibrant-orange">{wpm}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TyperPage;