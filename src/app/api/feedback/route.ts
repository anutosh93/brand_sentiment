import { NextRequest, NextResponse } from 'next/server';

type FeedbackBody = {
  brandName?: string;
  postUrl: string;
  commentIndex: number;
  variantId?: string;
  helpful?: boolean;
  reasonTags?: string[]; // e.g., ['helpful-link','tone','not-relevant']
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FeedbackBody;
    if (!body || !body.postUrl || typeof body.commentIndex !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // For now, log to server output; later wire to analytics store
    console.log('recommendation_feedback', {
      brandName: body.brandName ?? null,
      postUrl: body.postUrl,
      commentIndex: body.commentIndex,
      variantId: body.variantId ?? null,
      helpful: Boolean(body.helpful),
      reasonTags: Array.isArray(body.reasonTags) ? body.reasonTags.slice(0, 5) : [],
      ts: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


