import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AuctionManagementPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Auction Management</h1>
        <Button>Create New Item</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Auction Items</CardTitle>
          <CardDescription>Manage items available for auction.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Auction item list will be displayed here.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Scheduled & Active Auctions</CardTitle>
          <CardDescription>Monitor and manage ongoing auctions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Auction list will be displayed here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuctionManagementPage;