'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Quitar de la shortlist. Exige confirmación explícita (dos pasos) porque es
 * una acción destructiva y un clic de más pierde trabajo que el usuario hizo a
 * mano. Sin `window.confirm`: bloquea el hilo y no es accesible por teclado de
 * forma fiable.
 */
export function RemoveButton({
  slug,
  label,
  confirmLabel,
  doneLabel,
}: {
  slug: string;
  label: string;
  confirmLabel: string;
  doneLabel: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'confirming' | 'removing' | 'done' | 'error'>('idle');

  async function remove() {
    setState('removing');
    try {
      const response = await fetch('/api/shortlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, action: 'remove' }),
      });
      if (!response.ok) {
        setState('error');
        return;
      }
      setState('done');
      router.refresh();
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return <span className="text-xs text-[var(--text-faint)]">✓ {doneLabel}</span>;
  }

  if (state === 'confirming' || state === 'removing') {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={remove}
          disabled={state === 'removing'}
          className="rounded-[6px] border border-[var(--state-closed)]/50 px-2 py-1 text-[var(--state-closed)] hover:bg-[var(--surface-2)] disabled:opacity-60"
        >
          {state === 'removing' ? '…' : confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="text-[var(--text-faint)] hover:text-[var(--text-secondary)]"
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setState('confirming')}
      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-accent-hi)]"
    >
      {state === 'error' ? '✕' : label}
    </button>
  );
}