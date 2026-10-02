import {
  type FundingType,
  type NormalizedRecord,
  type ParseOutcome,
  type SourceAdapter,
  type SourceDescriptor,
} from '../source-adapter';
import type { DeadlinePrecision } from '../../core/status/types';

const FEED_URL = 'https://www.eacea.ec.europa.eu/node/253/rss_en';

/**
 * Única fuente automatizada del MVP (discovery D2). `legal-matrix` la marca
 * HABILITABLE: el RSS es un feed delta oficial de la agencia.
 */
export const EACEA_DESCRIPTOR: SourceDescriptor = {
  id: 'eacea',
  name: 'EACEA — Erasmus Mundus Joint Master Degrees',
  homepage: 'https://www.eacea.ec.europa.eu/',
  licence: 'EU Open Data / RSS feed oficial',
  kind: 'automated',
  feedUrl: FEED_URL,
  legalClearance: 'CLEARED',
};

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(input: string): string {
  let out = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Numéricas primero: `&#8217;` debe resolverse antes de que `&amp;#8217;`
  // se convierta en un `&` que luego se interpretaría como entity.
  out = out.replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => {
    const code = Number.parseInt(hex, 16);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
  out = out.replace(/&#(\d+);/g, (_m, dec: string) => {
    const code = Number.parseInt(dec, 10);
    return Number.isFinite(code) && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
  out = out.replace(
    /&([a-z][a-z0-9]*);/gi,
    (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
  );
  return out;
}

function text(block: string, tag: string): string | null {
  const match = new RegExp(`<(?:[a-z0-9]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-z0-9]+:)?${tag}>`, 'i').exec(
    block,
  );
  if (match?.[1] === undefined) return null;
  const cleaned = decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
  return cleaned === '' ? null : cleaned;
}

/**
 * El RSS de EACEA **no publica un enum de estado**. Publica fechas. Por eso
 * `sourceStatus` queda `null` y el estado lo decide `resolveStatus()` a partir
 * del deadline. Nunca inferimos "cerrada" leyendo prosa (data-strategy §3.5).
 */
export function parseEaceaFeed(body: string): ParseOutcome {
  const items = body.match(/<item\b[\s\S]*?<\/item>/gi);
  if (items === null || items.length === 0) {
    return { ok: false, reason: 'El feed no contiene elementos <item>', needsReview: true };
  }

  const records: NormalizedRecord[] = [];
  for (const item of items) {
    const title = text(item, 'title');
    const link = text(item, 'link');
    if (title === null || link === null) continue;

    const description = text(item, 'description');

    records.push({
      sourceRecordId: link,
      title,
      provider: text(item, 'dc:creator') ?? 'EACEA / Erasmus Mundus',
      university: null,
      officialUrl: link,
      applicationUrl: link,
      countryIso2: null,
      level: 'MASTER',
      fields: ['MASTER'],
      // El RSS **no declara** modalidad de financiación. Un `FULL` aquí sería
      // fabricar un dato que sostiene una decisión de dinero (value-impact §2).
      // Va `UNKNOWN` hasta que una persona lo confirme en la fuente oficial.
      fundingType: 'UNKNOWN' as FundingType,
      cycleLabel: text(item, 'category'),
      evidence: {
        sourceStatus: null,
        // `pubDate` es la fecha de publicación del item en el feed, NO una fecha
        // de cierre declarada por la convocatoria. Guardarla como `deadlineAt`
        // haría que la ficha mostrara un countdown inventado sobre una fecha sin
        // relación con la/postulación. El deadline real requiere verificación
        // humana contra la página del programa.
        deadlineAt: null,
        deadlineBasis: 'unknown',
        sourceExplicitlySaysClosed: false,
        sourceExplicitlySaysPaused: false,
        openingDate: null,
      },
      deadlineAt: null,
      deadlineBasis: 'unknown',
      deadlinePrecision: 'UNKNOWN' as DeadlinePrecision,
      deadlineTz: null,
      // El texto crudo se conserva para el revisor, no para el usuario final.
      deadlineRawText: text(item, 'pubDate'),
      provenance: {
        title: { sourceFieldPath: 'item.title', parseConfidence: 'HIGH' },
        link: { sourceFieldPath: 'item.link', parseConfidence: 'HIGH' },
        ...(description === null
          ? {}
          : {
              description: { sourceFieldPath: 'item.description', parseConfidence: 'LOW' },
            }),
      },
    });
  }

  if (records.length === 0) {
    return { ok: false, reason: 'Ningún item tenía title + link', needsReview: true };
  }
  return { ok: true, records };
}

export const eaceaAdapter: SourceAdapter = {
  descriptor: EACEA_DESCRIPTOR,
  parse: parseEaceaFeed,
};