"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

const StorePage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Store</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Store!</CardTitle>
          <CardDescription>Spend your Game Points on cool items and power-ups.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10 text-muted-foreground">
          <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
          <p>The store is currently empty. Check back soon for new items!</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StorePage;