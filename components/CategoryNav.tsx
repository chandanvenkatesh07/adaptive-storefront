'use client';
import { useRouter } from 'next/navigation';
import { usePersona } from '@/lib/persona-context';

const CATEGORIES: { label: string; tags: string[] }[] = [
  { label: 'Plumbing',     tags: ['plumbing', 'repair', 'leak'] },
  { label: 'Tools',        tags: ['tool', 'repair', 'beginner'] },
  { label: 'Power Tools',  tags: ['power-tool', 'project'] },
  { label: 'Outdoor',      tags: ['outdoor', 'patio', 'seasonal'] },
  { label: 'Garden',       tags: ['garden', 'outdoor', 'seasonal'] },
  { label: 'Lighting',     tags: ['outdoor', 'popular', 'home'] },
  { label: 'Smart Home',   tags: ['upgrade', 'popular', 'best-seller'] },
  { label: 'Paint',        tags: ['project', 'popular', 'best-seller'] },
  { label: 'Workwear',     tags: ['gift', 'dad', 'popular'] },
  { label: 'Gift Ideas',   tags: ['gift', 'dad', 'popular'] },
];

export function CategoryNav() {
  const { persona } = usePersona();
  const router = useRouter();

  const categories = !persona
    ? CATEGORIES
    : (() => {
        const personaTags = new Set(persona.signals.flatMap(s => s.tags));
        return [...CATEGORIES]
          .map(c => ({ ...c, score: c.tags.filter(t => personaTags.has(t)).length }))
          .sort((a, b) => b.score - a.score);
      })();

  return (
    <nav className="bg-white border-b border-line">
      <div className="max-w-8xl mx-auto px-4">
        <div className="flex items-stretch gap-0 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.label}
              onClick={() => router.push(`/?q=${encodeURIComponent(cat.label)}`)}
              className="shrink-0 px-4 py-3 text-xs font-display font-semibold text-steel hover:text-brand border-b-2 border-transparent hover:border-brand transition-colors whitespace-nowrap"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
