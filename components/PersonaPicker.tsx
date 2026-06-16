"use client";

import { PERSONAS, type Persona } from "@/lib/personas";
import { inferFromSignals } from "@/lib/signals";

type PersonaPickerProps = {
  activePersona: Persona | null;
  onSelect: (persona: Persona) => void;
  onClear: () => void;
};

type AvatarStyle = {
  base: string;
  accent: string;
  mark: string;
  initials: string;
};

const AVATAR_STYLES: Record<string, AvatarStyle> = {
  mid_repair: {
    base: "bg-ink",
    accent: "bg-brand",
    mark: "bg-concrete",
    initials: "MR",
  },
  appliance_buyer: {
    base: "bg-[#264653]",
    accent: "bg-[#8AB7C6]",
    mark: "bg-white",
    initials: "AB",
  },
  gift_conflict: {
    base: "bg-brand",
    accent: "bg-[#F8C471]",
    mark: "bg-white",
    initials: "GS",
  },
  nudged_browser: {
    base: "bg-[#46664A]",
    accent: "bg-[#B7C97B]",
    mark: "bg-white",
    initials: "NB",
  },
  blank_slate: {
    base: "bg-steel",
    accent: "bg-concrete-2",
    mark: "bg-white",
    initials: "BS",
  },
  budget_gift: {
    base: "bg-[#7A4F2C]",
    accent: "bg-[#F3A847]",
    mark: "bg-white",
    initials: "BG",
  },
};

function PersonaAvatar({ persona }: { persona: Persona }) {
  const style = AVATAR_STYLES[persona.id] ?? AVATAR_STYLES.blank_slate;

  return (
    <div className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ${style.base}`}>
      <span className={`absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full ${style.accent}`} />
      <span className={`absolute bottom-1 right-1 h-2 w-6 rounded-full ${style.mark} opacity-90`} />
      <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display text-sm font-black text-white">
        {style.initials}
      </span>
    </div>
  );
}

function signalHint(persona: Persona) {
  if (persona.signals.length === 0) return "Cold start";
  const count = persona.signals.length;
  const { evidence } = inferFromSignals(persona.signals);
  return `${count} signal${count === 1 ? "" : "s"} · ${evidence.confidence} confidence`;
}

export function PersonaPicker({ activePersona, onSelect, onClear }: PersonaPickerProps) {
  return (
    <section className="rounded-lg border border-line bg-card p-3 shadow-sm md:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-steel">Demo shoppers</p>
          <h2 className="font-display text-lg font-black text-ink">Pick a shopper</h2>
        </div>
        {activePersona && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-line bg-white px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-steel transition-colors hover:border-brand hover:text-brand"
          >
            Guest
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {PERSONAS.map((persona) => {
          const isActive = activePersona?.id === persona.id;
          return (
            <button
              key={persona.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(persona)}
              className={`min-h-[136px] rounded-lg border bg-white p-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-card ${
                isActive
                  ? "border-brand shadow-[0_0_0_2px_rgba(232,85,45,0.16)]"
                  : "border-line hover:-translate-y-0.5 hover:border-brand/70 hover:shadow-sm"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <PersonaAvatar persona={persona} />
                {isActive && (
                  <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_0_3px_rgba(232,85,45,0.14)]" aria-label="Active" />
                )}
              </div>
              <h3 className="mb-1 font-display text-sm font-black leading-tight text-ink">
                {persona.name}
              </h3>
              <p className="mb-2 min-h-[2rem] text-xs leading-tight text-steel line-clamp-2">
                {persona.role}
              </p>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-steel-2">
                {signalHint(persona)}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
