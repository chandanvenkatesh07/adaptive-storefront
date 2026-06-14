'use client';
import React, { createContext, useContext, useState } from 'react';
import type { Persona } from './personas';
import type { EvidenceTrace } from './signals';

type PersonaCtx = {
  persona: Persona | null;
  evidence: EvidenceTrace | null;
  setActive: (persona: Persona, evidence: EvidenceTrace) => void;
  clear: () => void;
};

const PersonaContext = createContext<PersonaCtx | null>(null);

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [evidence, setEvidence] = useState<EvidenceTrace | null>(null);

  const setActive = (p: Persona, e: EvidenceTrace) => {
    setPersona(p);
    setEvidence(e);
  };

  const clear = () => { setPersona(null); setEvidence(null); };

  return (
    <PersonaContext.Provider value={{ persona, evidence, setActive, clear }}>
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
}
