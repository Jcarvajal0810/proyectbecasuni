import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  notify,
  shouldNotify,
  stalenessAlert,
  syncFailureAlert,
  type AlertPayload,
} from '../src/observability/notify';

const SAVED = { ...process.env };
afterEach(() => {
  process.env = { ...SAVED };
  vi.unstubAllGlobals();
});

const NOW = new Date('2026-10-01T12:00:00Z');
function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 3_600_000);
}

describe('shouldNotify', () => {
  it('avisa la primera vez', () => {
    expect(
      shouldNotify({ lastNotifiedAt: null, now: NOW, repeatAfterHours: 24 }),
    ).toBe(true);
  });

  it('no repite dentro de la ventana', () => {
    expect(
      shouldNotify({ lastNotifiedAt: hoursAgo(2), now: NOW, repeatAfterHours: 24 }),
    ).toBe(false);
  });

  it('repite una vez vencida la ventana', () => {
    expect(
      shouldNotify({ lastNotifiedAt: hoursAgo(25), now: NOW, repeatAfterHours: 24 }),
    ).toBe(true);
  });

  it('repite aunque el problema lleve días, para que no se pierda', () => {
    expect(
      shouldNotify({ lastNotifiedAt: hoursAgo(240), now: NOW, repeatAfterHours: 24 }),
    ).toBe(true);
  });

  it('repite si el reloj del servidor va por detrás', () => {
    // Tragar la alerta por un reloj desincronizado es el peor fallo posible:
    // el usuario deja de enterarse justo cuando el problema persiste.
    expect(
      shouldNotify({ lastNotifiedAt: hoursAgo(-3), now: NOW, repeatAfterHours: 24 }),
    ).toBe(true);
  });
});

describe('notify', () => {
  const payload: AlertPayload = { title: 'Sync caído', message: 'Detalle', severity: 'error' };

  it('not_configured sin webhook configurado', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    expect(await notify(payload)).toBe('not_configured');
  });

  it('envía el cuerpo con título, mensaje y severidad', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://ntfy.sh/becas';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    expect(await notify(payload)).toBe('sent');

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init.body));
    expect(body.title).toBe('Sync caído');
    // ntfy usa `topic` + `priority`; `severity` es el nombre interno del módulo.
    expect(body.topic).toBe('error');
    expect(body.priority).toBe(5);
  });

  it('failed cuando el canal responde con error', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://ntfy.sh/becas';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    expect(await notify(payload)).toBe('failed');
  });

  it('nunca lanza si la red está caída', async () => {
    // Regla 1 del módulo: un fallo de la alerta no puede tumbar el sync.
    process.env.ALERT_WEBHOOK_URL = 'https://ntfy.sh/becas';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('getaddrinfo ENOTFOUND')),
    );

    await expect(notify(payload)).resolves.toBe('failed');
  });

  it('nunca lanza si el canal no responde a tiempo', async () => {
    // Sin timeout, el cron se colgaría hasta que Vercel lo mate a mitad: un
    // aviso fallido convertido en sync interrumpido.
    process.env.ALERT_WEBHOOK_URL = 'https://ntfy.sh/becas';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      ),
    );

    // 50 ms en vez de 5 s: el comportamiento es idéntico y el test no depende
    // del reloj real.
    expect(await notify(payload, { timeoutMs: 50 })).toBe('failed');
  });

  it('añade el bearer solo si hay token', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://hooks.slack.com/x';
    process.env.ALERT_WEBHOOK_TOKEN = 'secret-token';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await notify(payload);

    const headers = fetchMock.mock.calls[0]![1].headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer secret-token');
  });
});

describe('syncFailureAlert', () => {
  it('null si no hubo fallos', () => {
    expect(syncFailureAlert([{ sourceId: 'eacea', outcome: 'ok', detail: null }], 'es')).toBeNull();
  });

  it('null para un outcome de salto, que no es un fallo', () => {
    // `skipped_circuit_open` significa que ya se avisó antes y no se reintentó.
    // Contarlo como fallo nuevo daría una alerta diaria sobre un problema ya
    // conocido, que es como el usuario aprende a ignorar el canal.
    expect(
      syncFailureAlert([{ sourceId: 'eacea', outcome: 'skipped_circuit_open', detail: null }], 'es'),
    ).toBeNull();
  });

  it('reporta las fuentes que fallaron', () => {
    const alert = syncFailureAlert(
      [
        { sourceId: 'eacea', outcome: 'ok', detail: null },
        { sourceId: 'daad', outcome: 'failed', detail: 'http_5xx' },
      ],
      'es',
    );
    expect(alert?.severity).toBe('error');
    expect(alert?.facts?.fuentes).toBe('daad');
  });

  it('texto en inglés para el canal en inglés', () => {
    const alert = syncFailureAlert([{ sourceId: 'x', outcome: 'failed', detail: null }], 'en');
    expect(alert?.title).toContain('Sync failed');
  });
});

describe('stalenessAlert', () => {
  it('null sin edad conocida', () => {
    expect(stalenessAlert(null, 'es')).toBeNull();
  });

  it('warning entre 24 y 72 h', () => {
    expect(stalenessAlert(30, 'es')?.severity).toBe('warning');
  });

  it('error a partir de 72 h', () => {
    expect(stalenessAlert(96, 'es')?.severity).toBe('error');
  });
});