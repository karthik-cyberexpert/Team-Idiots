"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const sampleTexts = [
  "The quick brown fox jumps over the lazy dog.",
  "Never underestimate the power of a good book.",
  "Technology has revolutionized the way we live and work.",
  "The early bird catches the worm, but the second mouse gets the cheese.",
  "Creativity is intelligence having fun.",
  "The only way to do great work is to love what you do.",
  "Life is what happens when you're busy making other plans.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Innovation distinguishes between a leader and a follower.",
];

const TyperPage = () => {
  const [currentText, setCurrentText] = React.useState("");
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const resetTest = React.useCallback(() => {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length);
    setCurrentText(sampleTexts[randomIndex]);
    setInputText("");
    setStartTime(null);
    setEndTime(null);
    setAccuracy(null);
    setWpm(null);
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    resetTest();
  }, [resetTest]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (!startTime) {
      setStartTime(Date.now());
    }

    if (value === currentText) {
      setEndTime(Date.now());
      calculateResults();
    }
  };

  const calculateResults = () => {
    if (startTime && endTime) {
      const durationInMinutes = (endTime - startTime) / 60000;
      const wordsTyped = currentText.split(" ").length;
      const calculatedWpm = Math.round(wordsTyped / durationInMinutes);
      setWpm(calculatedWpm);

      let correctChars = 0;
      for (let i = 0; i < inputText.length; i++) {
        if (inputText[i] === currentText[i]) {
          correctChars++;
        }
      }
      const calculatedAccuracy = (correctChars / currentText.length) * 100;
      setAccuracy(parseFloat(calculatedAccuracy.toFixed(2)));
    }
  };

  const getCharClass = (char: string, index: number) => {
    if (index < inputText.length) {
      return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
    }
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer</h1>
      <p className="text-muted-foreground">Test and improve your typing speed and accuracy!</p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Typing Test</CardTitle>
          <CardDescription>Type the text below as fast and accurately as you can.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed">
            {currentText.split("").map((char, index) => (
              <span key={index} className={cn(getCharClass(char, index))}>
                {char}
              </span>
            ))}
          </div>
          <Input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Start typing here..."
            className="text-lg"
            disabled={!!endTime}
          />
          <div className="flex justify-end">
            <Button onClick={resetTest} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Test
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