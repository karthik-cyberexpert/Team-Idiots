"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smile, Sparkles } from "lucide-react";

const FunSpacePage = () => {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8" />
              Fun Space
              <Smile className="h-8 w-8" />
            </div>
          </CardTitle>
          <CardDescription className="mt-2 text-vibrant-blue dark:text-vibrant-yellow">
            This is your dedicated area for fun activities and relaxation!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg text-muted-foreground">
            More exciting features will be added here soon. Stay tuned!
          </p>
          <p className="text-sm text-muted-foreground">
            For now, enjoy the vibrant colors and smooth animations of your app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FunSpacePage;