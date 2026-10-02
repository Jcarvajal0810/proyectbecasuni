import { describe, expect, it } from 'vitest';
import { parseEaceaFeed } from '../src/adapters/eacea/adapter';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>EACEA</title>
  <item>
    <title>Erasmus Mundus Joint Master in Sustainable Development</title>
    <link>https://example.edu/programmes/sustainable-development</link>
    <pubDate>Mon, 06 Apr 2026 11:00:00 GMT</pubDate>
    <description>Two year master, full tuition</description>
    <category>2026 call</category>
  </item>
  <item>
    <title>Master in Renewable Energy &amp; Management</title>
    <link>https://example.edu/programmes/renewable-energy</link>
    <pubDate>Tue, 05 May 2026 23:59:00 GMT</pubDate>
  </item>
</channel></rss>`;

describe('parseEaceaFeed', () => {
  it('parsea los items con title y link', () => {
    const result = parseEaceaFeed(FEED);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.title).toContain('Sustainable Development');
  });

  it('decodifica entidades XML', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[1]?.title).toBe('Master in Renewable Energy & Management');
  });

  it('NO convierte pubDate en deadline', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    // pubDate es la fecha de publicación del item en el feed. Usarla como
    // deadline mostraría un countdown sobre una fecha que no es de cierre.
    for (const record of result.records) {
      expect(record.deadlineAt).toBeNull();
      expect(record.evidence.deadlineAt).toBeNull();
      expect(record.deadlineTz).toBeNull();
    }
  });

  it('conserva el pubDate solo como texto crudo para el revisor', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.deadlineRawText).toBe('Mon, 06 Apr 2026 11:00:00 GMT');
  });

  it('NO inventa fundingType: el RSS no declara modalidad', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    // El feed dice "full tuition" en la descripción, pero eso es prosa libre,
    // no un campo estructurado. Publicar FULL sin verificación es exactamente
    // el tipo de dato fabricar que el brief prohíbe.
    expect(result.records[0]?.fundingType).toBe('UNKNOWN');
  });

  it('el RSS no publica un enum de estado: sourceStatus queda null', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.evidence.sourceStatus).toBeNull();
    expect(result.records[0]?.evidence.sourceExplicitlySaysClosed).toBe(false);
    expect(result.records[0]?.evidence.sourceExplicitlySaysPaused).toBe(false);
  });

  it('el deadline del RSS se marca unknown, no publisher_stated', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.deadlineBasis).toBe('unknown');
    expect(result.records[0]?.deadlinePrecision).toBe('UNKNOWN');
  });

it('decodifica entidades numéricas y hexadecimales', () => {
    const result = parseEaceaFeed(
      '<rss><channel><item><title>Caf&#233; &#x2014; Ni&#241;o</title>' +
        '<link>https://example.edu/x</link></item></channel></rss>',
    );
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.title).toBe('Café — Niño');
  });

it('decodifica una sola pasada: &amp;#8217; es texto literal', () => {
    const result = parseEaceaFeed(
      '<rss><channel><item><title>A &amp;#8217;B</title>' +
        '<link>https://example.edu/x</link></item></channel></rss>',
    );
    if (!result.ok) throw new Error('esperaba ok');
    // Decodificar dos veces convertiría un ampersand literal en un apóstrofo.
    expect(result.records[0]?.title).toBe('A &#8217;B');
  });

it('acepta tags con namespace en lugar de dc:creator literal', () => {
    const result = parseEaceaFeed(
      '<rss><channel><item><title>T</title><link>https://example.edu/x</link>' +
        '<dc:creator>Agencia</dc:creator></item></channel></rss>',
    );
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.provider).toBe('Agencia');
  });

  it('registra provenance por campo', () => {
    const result = parseEaceaFeed(FEED);
    if (!result.ok) throw new Error('esperaba ok');
    expect(result.records[0]?.provenance.title?.sourceFieldPath).toBe('item.title');
    expect(result.records[0]?.provenance.title?.parseConfidence).toBe('HIGH');
  });

  it('falla de forma explícita si no hay items', () => {
    const result = parseEaceaFeed('<rss><channel></channel></rss>');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.needsReview).toBe(true);
  });

  it('descarta items sin link', () => {
    const result = parseEaceaFeed(
      '<rss><channel><item><title>Sin enlace</title></item></channel></rss>',
    );
    expect(result.ok).toBe(false);
  });
});