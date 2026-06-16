'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Persona } from './personas';
import { PERSONAS } from './personas';
import type { EvidenceTrace } from './signals';

const PERSONA_KEY = 'buildright_persona_v1';

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

  // Rehydrate from localStorage on mount so the demo shopper survives browser restarts.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONA_KEY);
      if (!raw) return;
      const { personaId, evidence: savedEvidence } = JSON.parse(raw) as {
        personaId: string;
        evidence: EvidenceTrace;
      };
      const found = PERSONAS.find(p => p.id === personaId) ?? null;
      if (found && savedEvidence) {
        setPersona(found);
        setEvidence(savedEvidence);
      }
    } catch {}
  }, []);

  const setActive = (p: Persona, e: EvidenceTrace) => {
    setPersona(p);
    setEvidence(e);
    try {
      localStorage.setItem(PERSONA_KEY, JSON.stringify({ personaId: p.id, evidence: e }));
    } catch {}
  };

  const clear = () => {
    setPersona(null);
    setEvidence(null);
    try {
      localStorage.removeItem(PERSONA_KEY);
    } catch {}
  };

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
