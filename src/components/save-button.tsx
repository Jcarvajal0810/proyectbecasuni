'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Guardar en la shortlist anónima (D5).
 *
 * El token viaja en una cookie `httpOnly`, así que este componente **no puede**
 * leerlo — y no debe intentarlo. El estado del botón es puramente optimista: tras
 * un 200 se marca como guardado, y `router.refresh()` reconcilia con el servidor.
 *
 * El botón no alterna add/remove a propósito. Quitar algo exige una confirmación
 * explícita en la página de shortlist, no un segundo clic que uno podría
 * equivocar (skill `designing-user-experience`: confirmación para acciones
 * destructivas).
 */
export function SaveButton({
  slug,
  label,
  savedLabel,
  errorLabel,
}: {
  slug: string;
  label: string;
  savedLabel: string;
  errorLabel: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save() {
    setState('saving');
    try {
      const response = await fetch('/api/shortlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, action: 'add' }),
      });

      if (response.ok) {
        setState('saved');
        router.refresh();
        return;
      }
      setState('error');
    } catch {
      setState('error');
    }
  }

  const text =
    state === 'saving' ? '…' : state === 'saved' ? savedLabel : state === 'error' ? errorLabel : label;

  return (
    <button
      type="button"
      onClick={save}
      disabled={state === 'saving' || state === 'saved'}
      aria-live="polite"
      className="ml-auto rounded-[8px] border border-[var(--line-control)] px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-60"
    >
      {state === 'saved' ? `✓ ${savedLabel}` : text}
    </button>
  );
}