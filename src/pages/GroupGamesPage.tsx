"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";

const GroupGamesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Group Games</h1>
      <Card className="text-center py-10">
        <CardHeader>
          <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle className="text-lg">No Games Available Yet</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            This section is under development. Stay tuned for exciting group games!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Future game listings or features will go here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupGamesPage;