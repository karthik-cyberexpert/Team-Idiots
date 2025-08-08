"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserCog } from "lucide-react";

const BuddiesManagementPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Buddies Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Buddy Pairs</CardTitle>
          <CardDescription>This is where you can create and manage buddy pairs.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          <UserCog className="mx-auto h-12 w-12 mb-4" />
          <p>Buddy management features are coming soon!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuddiesManagementPage;