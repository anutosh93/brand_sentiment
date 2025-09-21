import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import OpenAI from 'openai';
import {
  RecommendationRequestBody,
  RecommendationResponseBody,
  RecommendationItem,
  SentimentLabel,
} from '@/lib/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clampConfidence(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function normalizeSentiment(value: unknown): SentimentLabel {
  const v = String(value ?? '').toLowerCase();
  if (v.startsWith('pos')) return 'Positive';
  if (v.startsWith('neg')) return 'Negative';
  return 'Neutral';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RecommendationRequestBody;
    const { brandName, brandWebsite, post, comments } = body;

    if (!post || !Array.isArray(comments) || comments.length === 0) {
      return NextResponse.json(
        { error: 'Missing post context or comments' },
        { status: 400 },
      );
    }

    const systemPrompt = `You are a brand-safe assistant that recommends helpful, empathetic responses to Reddit comments.
Safety & Guardrails:
- No insults, arguments, accusations, or personal data.
- Use an empathetic, professional tone; avoid promises you cannot guarantee.
- Link only to the brand website or official subpages if a brandWebsite is provided; otherwise provide no links.
- Include actionable next steps (support link, contact, known workaround) when relevant.

Output rules:
- Respond in STRICT JSON only. Do NOT include markdown or code fences.
- One item per input comment, keep same order via index.
- Schema for each item: { index, sentiment: 'Positive'|'Neutral'|'Negative', topics: string[], recommendation: string, links: [{title,url}] , confidence: number (0..1), safetyFlags: string[] }`;

    const userPrompt = `Brand: ${brandName ?? 'Unknown'}
BrandWebsite: ${brandWebsite ?? 'Unknown'}
Post: ${JSON.stringify(post)}
Comments: ${JSON.stringify(comments)}

Task:
1) Classify each comment sentiment. 2) If Neutral/Negative, provide a concise, empathetic recommendation with clear next step and up to 3 official links (if brandWebsite provided); else write an encouraging acknowledgment. 3) Add topics[]. 4) Provide confidence between 0 and 1.
Return JSON array only.`;

    let raw = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      raw = completion.choices[0].message?.content ?? '[]';
    } catch (e) {
      // fall through to fallback below
    }

    const strip = (s: string) => s.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const text = strip(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback: neutral acknowledgments
      const fallback: RecommendationItem[] = comments.map((_, idx) => ({
        index: idx,
        sentiment: 'Neutral',
        topics: [],
        recommendation:
          'Thank you for sharing this. We appreciate the feedback and want to help—please reach out via our official support channel so we can look into this further.',
        links: brandWebsite
          ? [
              { title: 'Support', url: brandWebsite.replace(/\/?$/, '/') + 'support' },
            ]
          : [],
        confidence: 0.4,
        safetyFlags: [],
      }));
      const response: RecommendationResponseBody = { recommendations: fallback };
      return NextResponse.json(response);
    }

    const arr = Array.isArray(parsed) ? parsed : [];
    const recs: RecommendationItem[] = arr.map((r, idx) => {
      const rec = r as Record<string, unknown>;
      const links = Array.isArray(rec.links)
        ? (rec.links as Array<Record<string, unknown>>)
            .slice(0, 3)
            .map((l) => ({
              title: String(l.title ?? 'Link'),
              url: String(l.url ?? ''),
            }))
        : [];

      // Optionally filter links to brandWebsite
      const safeLinks = brandWebsite
        ? links.filter((l) => l.url.startsWith(brandWebsite))
        : links;

      return {
        index: typeof rec.index === 'number' ? (rec.index as number) : idx,
        sentiment: normalizeSentiment(rec.sentiment),
        topics: Array.isArray(rec.topics)
          ? (rec.topics as unknown[]).map((t) => String(t)).slice(0, 8)
          : [],
        recommendation: String(rec.recommendation ?? ''),
        links: safeLinks,
        confidence: clampConfidence(rec.confidence),
        safetyFlags: Array.isArray(rec.safetyFlags)
          ? (rec.safetyFlags as unknown[]).map((t) => String(t)).slice(0, 8)
          : [],
      } satisfies RecommendationItem;
    });

    const response: RecommendationResponseBody = { recommendations: recs };
    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


