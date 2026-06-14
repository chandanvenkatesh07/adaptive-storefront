'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { usePersona } from '@/lib/persona-context';
import { PERSONAS } from '@/lib/personas';
import { inferFromSignals } from '@/lib/signals';

export function Header() {
  const { count, setOpen: openCart } = useCart();
  const { persona, setActive, clear } = usePersona();
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');

  const placeholder =
    persona?.id === 'mid_repair'      ? 'Search faucet parts, plumbing, tools...'
    : persona?.id === 'gift_conflict' ? 'Search gifts, DIY tools, home improvement...'
    : persona?.id === 'nudged_browser'? 'Search patio, garden, outdoor...'
    : persona?.id === 'blank_slate'   ? 'Search all products...'
    : 'What can we help you find today?';

  const handleSelectPersona = (personaId: string) => {
    const p = PERSONAS.find(x => x.id === personaId);
    if (!p) return;
    const { evidence } = inferFromSignals(p.signals);
    setActive(p, evidence);
    setShowDropdown(false);
  };

  return (
    <header className="bg-ink text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-8xl mx-auto px-4 h-14 flex items-center gap-3">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-1">
          <span className="text-brand text-xl font-black font-display leading-none">▣</span>
          <span className="font-display font-black text-sm tracking-widest uppercase hidden md:block">
            BuildRight
          </span>
        </Link>

        {/* Search */}
        <div className="flex flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search.trim() && alert(`Search: ${search}`)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 bg-white text-ink text-sm rounded-l focus:outline-none placeholder:text-steel min-w-0"
          />
          <button className="bg-brand hover:bg-brand-dark px-4 py-2 rounded-r transition-colors shrink-0">
            <SearchIcon />
          </button>
        </div>

        {/* Persona selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/20 hover:border-white/50 transition-colors text-sm"
          >
            {persona ? (
              <>
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                <span className="font-display font-bold text-xs max-w-[100px] truncate hidden sm:block">
                  {persona.name}
                </span>
                <span className="font-display font-bold text-xs sm:hidden">Me</span>
              </>
            ) : (
              <span className="text-white/70 text-xs font-display">Sign in as</span>
            )}
            <span className="text-white/40 text-xs">▾</span>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded shadow-2xl border border-line z-50 overflow-hidden">
                <div className="px-3 py-2 bg-card border-b border-line">
                  <p className="font-mono text-xs text-steel uppercase tracking-widest">
                    Demo — pick a shopper
                  </p>
                </div>
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPersona(p.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-concrete transition-colors border-b border-line last:border-0 ${
                      persona?.id === p.id ? 'bg-concrete' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {persona?.id === p.id && (
                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                      )}
                      <div>
                        <div className="font-display font-bold text-sm text-ink">{p.name}</div>
                        <div className="font-mono text-xs text-steel mt-0.5 leading-tight">{p.role}</div>
                      </div>
                    </div>
                  </button>
                ))}
                {persona && (
                  <button
                    onClick={() => { clear(); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors border-t border-line font-mono"
                  >
                    Clear persona — browse as guest
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart button */}
        <button
          onClick={() => openCart(true)}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/20 hover:border-white/50 transition-colors shrink-0"
        >
          <CartIcon />
          <span className="font-display font-bold text-sm hidden sm:block">Cart</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand rounded-full text-white text-xs font-bold flex items-center justify-center leading-none">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
