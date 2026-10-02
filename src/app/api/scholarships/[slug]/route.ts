import { getScholarshipBySlug } from '@/db/queries';
import { applyRateLimitHeaders, clientKey, rateLimit } from '@/security/rate-limit';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const limit = rateLimit(`detail:${clientKey(request)}`, 120, 60_000);
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  applyRateLimitHeaders(headers, limit);

  if (!limit.allowed) return json({ error: 'rate_limited' }, 429, headers);

  const { slug } = await ctx.params;
  const record = await getScholarshipBySlug(slug);
  if (record === null) return json({ error: 'not_found' }, 404, headers);

  return json({ item: record }, 200, headers);
}

function json(body: unknown, status: number, headers: Headers): Response {
  return new Response(JSON.stringify(body), { status, headers });
}