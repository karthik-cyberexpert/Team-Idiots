import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel } from 'lucide-react';

const AuctionPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Live Auctions</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder for auction items */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Item</CardTitle>
            <CardDescription>This is a placeholder for an auction item.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Image</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Bid</p>
              <p className="text-2xl font-bold">100 GP</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time Remaining</p>
              <p className="font-semibold">12h 34m 56s</p>
            </div>
            <Button className="w-full">
              <Gavel className="mr-2 h-4 w-4" />
              Place Bid
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuctionPage;