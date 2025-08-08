"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users } from "lucide-react";

const BuddiesPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">My Buddies</h1>
      <Card>
        <CardHeader>
          <CardTitle>Buddy System</CardTitle>
          <CardDescription>This is where you can manage your buddies.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          <Users className="mx-auto h-12 w-12 mb-4" />
          <p>Buddy features are coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuddiesPage;