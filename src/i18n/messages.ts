/**
 * i18n ES + EN (decisión D13). Diccionario propio, sin librería de i18n: son dos
 * idiomas con copy revisado, y una dependencia para eso no se justifica.
 *
 * El idioma se elige por cookie `locale` y, si no existe, por `Accept-Language`.
 */

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export const LOCALE_COOKIE = 'locale';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'es' || value === 'en';
}

export function detectLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  if (acceptLanguage === null) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: (tag ?? '').toLowerCase(), q: q === undefined ? 1 : Number(q) };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

const es = {
  'nav.search': 'Buscar',
  'nav.methodology': 'Metodología',
  'nav.sources': 'Fuentes',
  'nav.shortlist': 'Guardadas',

  'shortlist.save': 'Guardar',
  'shortlist.saved': 'Guardado',
  'shortlist.saveError': 'No se pudo guardar',
  'shortlist.title': 'Tus guardadas',
  'shortlist.empty': 'Todavía no has guardado nada. Guarda una beca para verla aquí.',
  'shortlist.anonymous':
    'Esta lista se guarda en tu navegador con una clave anónima. No necesitas cuenta, pero si borras los datos del navegador también pierdes la lista.',
  'shortlist.count': '{n} guardadas',
  'shortlist.remove': 'Quitar',
  'shortlist.removeConfirm': 'Confirmar',
  'shortlist.removed': 'Quitada',

  'home.headline': 'Becas internacionales con fecha y fuente verificables',
  'home.sub': 'Cada registro enlaza a la convocatoria oficial y dice cuándo se comprobó por última vez. Cuando no se puede verificar, lo decimos en lugar de suponer.',
  'home.searchLabel': 'Buscar becas, programas o instituciones',
  'home.searchCta': 'Buscar',
  'home.closingSoon': 'Cierran pronto',
  'home.noCountdown': 'Sin fecha verificable',
  'home.emptyTitle': 'Todavía no hay registros publicados',
  'home.emptyBody':
    'El corpus se está curando. Puedes leer cómo seleccionamos las fuentes y qué significa cada estado.',

  'status.OPEN': 'Abierta',
  'status.UPCOMING': 'Próxima',
  'status.CLOSED': 'Cerrada',
  'status.EXPIRED': 'Vencida',
  'status.PAUSED': 'Suspendida',
  'status.UNKNOWN': 'No verificable',

  'field.deadline': 'Fecha límite',
  'field.provider': 'Organización',
  'field.university': 'Institución',
  'field.country': 'País',
  'field.level': 'Nivel',
  'field.cycle': 'Convocatoria',
  'field.source': 'Fuente',
  'field.lastVerified': 'Última verificación',
  'field.reason': 'Por qué este estado',

  'countdown.days': '{n} días',
  'countdown.hours': '{n} h',
  'countdown.estimated': 'Fecha estimada según el ciclo del programa',
  'countdown.until': 'Cierra el {when}',
  'verified.bySource': 'Declarado por la fuente',
  'verified.byUs': 'Fecha estimada por nosotros',
  'verified.none': 'La fuente no declara una fecha límite',

  'detail.openSource': 'Abrir la convocatoria oficial',
  'detail.verbatim': 'Texto de la fuente',
  'detail.unknownExplain':
    'No pudimos verificar esta convocatoria ahora. No significa que esté cerrada: significa que no lo sabemos. En el enlace oficial está el estado real.',
  'detail.lastKnown': 'Último estado con evidencia: {status}',

  'method.title': 'Cómo construimos esto',
  'method.sourcesTitle': 'De dónde salen los registros',
  'method.statesTitle': 'Qué significa cada estado',
  'method.disclaimer':
    'No somos parte de ninguna convocatoria ni de ningún organismo. No garantizamos plazas, importes ni resultados. Siempre confirma en la fuente oficial.',
  'method.noData': 'No publicado',
  'method.stalenessWarning':
    'La verificación automática se ha retrasado. Los estados y fechas pueden no reflejar la información más reciente; contrasta siempre con el enlace oficial.',
  'method.stalenessCritical':
    'AVISO: no hemos podido verificar los datos recientemente. Trata los estados y fechas como orientativos y confirma en la fuente oficial antes de solicitar.',
  'method.hoursAgo': 'hace ~{n} h',
  'method.lastFetch': 'Última consulta',
  'method.rulesTitle': 'Las reglas que aplicamos',
  'method.ruleDeadline':
    'Solo mostramos días restantes cuando la convocatoria declara su propia fecha de cierre. Si la fecha no está publicada, no hay cuenta atrás: prefiero no decir nada antes que decir algo falso.',
  'method.ruleStatus':
    'Nunca cerramos una convocatoria porque el fetch falló. Si no se puede verificar, el estado es "no lo sabemos", que es distinto de "cerrada".',
  'method.ruleVerify':
    'Cada registro enlaza a su fuente oficial y muestra cuándo se comprobó por última vez.',

  'common.results': '{n} resultados',
  'common.resultsOne': '1 resultado',
  'common.loadMore': 'Cargar más',
  'common.backToStart': 'Volver al inicio',
  'common.loading': 'Cargando',
  'common.error': 'No pudimos cargar los resultados',
  'common.retry': 'Reintentar',
  'common.all': 'Todas',
  'common.filters': 'Filtros',
  'common.clear': 'Limpiar',
  'common.readMore': 'Ver ficha',
  'common.sourceLink': 'Ver en la fuente',
} as const;

const en: Record<keyof typeof es, string> = {
  'nav.search': 'Search',
  'nav.methodology': 'Methodology',
  'nav.sources': 'Sources',
  'nav.shortlist': 'Saved',

  'shortlist.save': 'Save',
  'shortlist.saved': 'Saved',
  'shortlist.saveError': 'Could not save',
  'shortlist.title': 'Your saved list',
  'shortlist.empty': 'You have not saved anything yet. Save a scholarship to see it here.',
  'shortlist.anonymous':
    'This list is kept in your browser under an anonymous key. No account needed, but clearing browser data also clears the list.',
  'shortlist.count': '{n} saved',
  'shortlist.remove': 'Remove',
  'shortlist.removeConfirm': 'Confirm',
  'shortlist.removed': 'Removed',

  'home.headline': 'International scholarships with a verifiable date and source',
  'home.sub': 'Every record links to the official call and states when it was last checked. When we cannot verify it, we say so instead of guessing.',
  'home.searchLabel': 'Search scholarships, programmes or institutions',
  'home.searchCta': 'Search',
  'home.closingSoon': 'Closing soon',
  'home.noCountdown': 'No verifiable date',
  'home.emptyTitle': 'No records published yet',
  'home.emptyBody': 'The corpus is being curated. Read how we select sources and what each state means.',

  'status.OPEN': 'Open',
  'status.UPCOMING': 'Upcoming',
  'status.CLOSED': 'Closed',
  'status.EXPIRED': 'Expired',
  'status.PAUSED': 'Paused',
  'status.UNKNOWN': 'Not verifiable',

  'field.deadline': 'Deadline',
  'field.provider': 'Programme',
  'field.university': 'Institution',
  'field.country': 'Country',
  'field.level': 'Level',
  'field.cycle': 'Call',
  'field.source': 'Source',
  'field.lastVerified': 'Last checked',
  'field.reason': 'Why this state',

  'countdown.days': '{n} days',
  'countdown.hours': '{n} h',
  'countdown.estimated': 'Estimated date from the programme cycle',
  'countdown.until': 'Closes {when}',
  'verified.bySource': 'Declared by the source',
  'verified.byUs': 'Estimated by us',
  'verified.none': 'The source declares no deadline',

  'detail.openSource': 'Open the official call',
  'detail.verbatim': 'Source text',
  'detail.unknownExplain':
    'We could not verify this call right now. That does not mean it is closed: it means we do not know. The official link has the real state.',
  'detail.lastKnown': 'Last state with evidence: {status}',

  'method.title': 'How this is built',
  'method.sourcesTitle': 'Where the records come from',
  'method.statesTitle': 'What each state means',
  'method.disclaimer':
    'We are not part of any call or organisation. We do not guarantee places, amounts or outcomes. Always confirm on the official source.',
  'method.noData': 'Not published',
  'method.stalenessWarning':
    'Automatic verification is running late. Statuses and dates may not reflect the latest information; always check the official link.',
  'method.stalenessCritical':
    'WARNING: we have not been able to verify the data recently. Treat statuses and dates as indicative and confirm on the official source before applying.',
  'method.hoursAgo': '~{n} h ago',
  'method.lastFetch': 'Last fetch',
  'method.rulesTitle': 'The rules we apply',
  'method.ruleDeadline':
    'We only show days remaining when the programme states its own closing date. If no date is published, there is no countdown: saying nothing beats saying something false.',
  'method.ruleStatus':
    'We never close a programme because a fetch failed. If it cannot be verified, the state is "we do not know", which is not the same as "closed".',
  'method.ruleVerify':
    'Every record links to its official source and shows when it was last checked.',

  'common.results': '{n} results',
  'common.resultsOne': '1 result',
  'common.loadMore': 'Load more',
  'common.backToStart': 'Back to start',
  'common.loading': 'Loading',
  'common.error': 'We could not load the results',
  'common.retry': 'Retry',
  'common.all': 'All',
  'common.filters': 'Filters',
  'common.clear': 'Clear',
  'common.readMore': 'View record',
  'common.sourceLink': 'View at source',
};

export type MessageKey = keyof typeof es;

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { es, en };

export function getDictionary(locale: Locale): Record<MessageKey, string> {
  return DICTIONARIES[locale];
}

/** Sustituye `{n}` y `{status}` sin interpretar HTML: el resultado es texto. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}