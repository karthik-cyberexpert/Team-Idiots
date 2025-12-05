import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { GameMode } from "@/types/space-boss";
import { CheckCircle2, XCircle } from "lucide-react";

interface GameModesProps {
  mode: GameMode;
  onSuccess: (damage: number) => void;
}

export function GameModes({ mode, onSuccess }: GameModesProps) {
  if (mode === 'programming') return <ProgrammingMode onSuccess={onSuccess} />;
  if (mode === 'software') return <SoftwareMode onSuccess={onSuccess} />;
  if (mode === 'learning') return <LearningMode onSuccess={onSuccess} />;
  return <div>Unknown Mode</div>;
}

function ProgrammingMode({ onSuccess }: { onSuccess: (damage: number) => void }) {
  const [code, setCode] = useState("// Write your solution here\nfunction solution(a, b) {\n  return a + b;\n}");
  const [output, setOutput] = useState("");

  const runCode = () => {
    // Mock execution
    setOutput("Running tests...\nTest 1: Passed\nTest 2: Passed\nAll tests passed!");
    setTimeout(() => onSuccess(50), 1000);
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Programming Challenge</CardTitle>
        <p className="text-sm text-muted-foreground">Implement a function that adds two numbers.</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <Textarea 
          value={code} 
          onChange={(e) => setCode(e.target.value)} 
          className="flex-1 font-mono resize-none"
        />
        <div className="bg-black/80 text-green-400 p-2 rounded-md h-24 font-mono text-sm overflow-auto whitespace-pre-wrap">
          {output || "> Ready to execute..."}
        </div>
        <Button onClick={runCode} className="w-full">Run Code & Fire Laser</Button>
      </CardContent>
    </div>
  );
}

function SoftwareMode({ onSuccess }: { onSuccess: (damage: number) => void }) {
  const [html, setHtml] = useState("<div class='box'></div>");
  const [css, setCss] = useState(".box { width: 100px; height: 100px; background: red; }");

  const submit = () => {
    // Mock validation
    setTimeout(() => onSuccess(75), 500);
  };

  return (
    <div className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Recreate the UI</CardTitle>
        <p className="text-sm text-muted-foreground">Match the reference image using HTML & CSS.</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <div className="space-y-2">
            <Label>HTML</Label>
            <Textarea value={html} onChange={(e) => setHtml(e.target.value)} className="h-full font-mono resize-none" />
          </div>
          <div className="space-y-2">
            <Label>CSS</Label>
            <Textarea value={css} onChange={(e) => setCss(e.target.value)} className="h-full font-mono resize-none" />
          </div>
        </div>
        <Button onClick={submit} className="w-full">Submit Design</Button>
      </CardContent>
    </div>
  );
}

function LearningMode({ onSuccess }: { onSuccess: (damage: number) => void }) {
  const [selected, setSelected] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  const checkAnswer = () => {
    if (selected === "option2") {
      setFeedback("correct");
      setTimeout(() => {
        onSuccess(25);
        setFeedback(null);
        setSelected("");
      }, 1000);
    } else {
      setFeedback("incorrect");
    }
  };

  return (
    <div className="flex flex-col h-full justify-center">
      <CardHeader>
        <CardTitle>Quick Fire Quiz</CardTitle>
        <p className="text-sm text-muted-foreground">What is the correct syntax for a React hook?</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-3">
          <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="option1" id="o1" />
            <Label htmlFor="o1" className="cursor-pointer flex-1">function useState()</Label>
          </div>
          <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="option2" id="o2" />
            <Label htmlFor="o2" className="cursor-pointer flex-1">const [state, setState] = useState()</Label>
          </div>
          <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="option3" id="o3" />
            <Label htmlFor="o3" className="cursor-pointer flex-1">var state = new State()</Label>
          </div>
          <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="option4" id="o4" />
            <Label htmlFor="o4" className="cursor-pointer flex-1">use State()</Label>
          </div>
        </RadioGroup>

        {feedback === "correct" && (
          <div className="flex items-center gap-2 text-green-500 justify-center font-bold animate-pulse">
            <CheckCircle2 /> Correct! Laser Fired!
          </div>
        )}
        {feedback === "incorrect" && (
          <div className="flex items-center gap-2 text-red-500 justify-center font-bold">
            <XCircle /> Incorrect, try again!
          </div>
        )}

        <Button onClick={checkAnswer} className="w-full" disabled={!selected || feedback !== null}>
          Submit Answer
        </Button>
      </CardContent>
    </div>
  );
}
