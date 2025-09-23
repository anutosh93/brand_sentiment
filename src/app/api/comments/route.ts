import { NextRequest, NextResponse } from 'next/server';

type RedditComment = { author: string; score: number; body: string; timestamp: string };

async function getAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT || 'brand-sentiment/1.0 (+set REDDIT_USER_AGENT)';
  if (!clientId || !clientSecret) throw new Error('Missing Reddit OAuth env');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': userAgent,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'read' }).toString(),
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('No access_token');
  return json.access_token;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postUrl = searchParams.get('u');
    const limitParam = Number(searchParams.get('limit') || 20);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 20;

    if (!postUrl) {
      return NextResponse.json({ comments: [] });
    }

    // Convert post URL to OAuth API path: extract permalink path
    const u = new URL(postUrl);
    const path = u.pathname.endsWith('/') ? u.pathname.slice(0, -1) : u.pathname;
    const apiPath = `${path}.json`;

    const token = await getAccessToken();
    const apiUrl = new URL(`https://oauth.reddit.com${apiPath}`);
    apiUrl.searchParams.set('sort', 'top');
    apiUrl.searchParams.set('limit', String(Math.max(1, Math.min(50, limit))));
    apiUrl.searchParams.set('raw_json', '1');

    const res = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'user-agent': process.env.REDDIT_USER_AGENT || 'brand-sentiment/1.0 (+set REDDIT_USER_AGENT)',
        accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ comments: [], error: `upstream ${res.status}` }, { status: 200 });
    }
    const data = await res.json();
    const listing = Array.isArray(data) ? data[1] : undefined;
    const children = listing?.data?.children ?? [];
    const comments: RedditComment[] = [];
    for (const c of children) {
      const d = c?.data;
      if (!d || typeof d.body !== 'string') continue;
      comments.push({
        author: String(d.author ?? 'unknown'),
        score: Number(d.score ?? 0),
        body: d.body,
        timestamp: new Date(Number(d.created_utc ?? Date.now() / 1000) * 1000).toISOString(),
      });
      if (comments.length >= limit) break;
    }
    return NextResponse.json({ comments });
  } catch {
    return NextResponse.json({ comments: [], error: 'failed' }, { status: 200 });
  }
}


