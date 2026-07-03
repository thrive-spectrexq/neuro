import { useState } from 'react';

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const askQuestion = async (question: string) => {
    setIsProcessing(true);
    // Mock response
    setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  return { askQuestion, isProcessing };
}
