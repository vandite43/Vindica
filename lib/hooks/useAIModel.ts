'use client';
import { useState, useEffect } from 'react';
import { DEFAULT_AI_MODEL } from '@/lib/constants';

const STORAGE_KEY = 'vindica_ai_model';

export function useAIModel() {
  const [model, setModelState] = useState<string>(DEFAULT_AI_MODEL);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setModelState(stored);
  }, []);

  function setModel(value: string) {
    localStorage.setItem(STORAGE_KEY, value);
    setModelState(value);
  }

  return { model, setModel };
}

export function getStoredModel(): string {
  if (typeof window === 'undefined') return DEFAULT_AI_MODEL;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_AI_MODEL;
}
