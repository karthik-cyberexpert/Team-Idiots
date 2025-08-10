"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Building2 } from "lucide-react";

const StoreManagementPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Store Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Store Items</CardTitle>
          <CardDescription>Add, edit, or remove items available for purchase in the user store.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          <Building2 className="mx-auto h-12 w-12 mb-4" />
          <p>Store management features will be available here soon.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreManagementPage;