import { useState } from 'react';
import { apiClient } from '../../lib/api';

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const askQuestion = async (question: string) => {
    setIsProcessing(true);
    try {
      const res = await apiClient.post('/ai/completion', { prompt: question });
      return res.data;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { askQuestion, isProcessing };
}
