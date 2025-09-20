import { NextRequest, NextResponse } from 'next/server';

type RedditComment = { author: string; score: number; body: string; timestamp: string };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postUrl = searchParams.get('u');
    const limitParam = Number(searchParams.get('limit') || 20);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 20;

    if (!postUrl) {
      return NextResponse.json({ comments: [] });
    }

    const jsonUrl = `${postUrl}${postUrl.endsWith('.json') ? '' : '.json'}?sort=top&limit=${limit}&raw_json=1`;
    const res = await fetch(jsonUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        accept: 'application/json, text/plain, */*',
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
  } catch (e) {
    return NextResponse.json({ comments: [], error: 'failed' }, { status: 200 });
  }
}


