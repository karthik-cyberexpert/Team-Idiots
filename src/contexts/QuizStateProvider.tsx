"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

interface QuizStateContextType {
  isQuizActive: boolean;
  setIsQuizActive: (isActive: boolean) => void;
}

const QuizStateContext = createContext<QuizStateContextType | undefined>(undefined);

export const QuizStateProvider = ({ children }: { children: ReactNode }) => {
  const [isQuizActive, setIsQuizActive] = useState(false);

  const value = { isQuizActive, setIsQuizActive };

  return (
    <QuizStateContext.Provider value={value}>
      {children}
    </QuizStateContext.Provider>
  );
};

export const useQuizState = () => {
  const context = useContext(QuizStateContext);
  if (context === undefined) {
    throw new Error('useQuizState must be used within a QuizStateProvider');
  }
  return context;
};