"use client";

import * as React from 'react';
import { GiftRevealDialog } from '@/components/gifting/GiftRevealDialog';
import { Notification } from '@/types/notification';

interface GiftingContextType {
  openGift: (notification: Notification) => void;
}

const GiftingContext = React.createContext<GiftingContextType | undefined>(undefined);

export const GiftingProvider = ({ children }: { children: React.ReactNode }) => {
  const [notification, setNotification] = React.useState<Notification | null>(null);

  const openGift = (notificationToOpen: Notification) => {
    setNotification(notificationToOpen);
  };

  const closeGift = () => {
    setNotification(null);
  };

  const value = { openGift };

  return (
    <GiftingContext.Provider value={value}>
      {children}
      <GiftRevealDialog
        open={!!notification}
        onOpenChange={(isOpen) => !isOpen && closeGift()}
        notification={notification}
      />
    </GiftingContext.Provider>
  );
};

export const useGifting = () => {
  const context = React.useContext(GiftingContext);
  if (context === undefined) {
    throw new Error('useGifting must be used within a GiftingProvider');
  }
  return context;
};