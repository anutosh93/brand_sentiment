import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { brandName, brandWebsite } = await req.json();

    const systemPrompt = `
You are an AI assistant that, given a brand name and its website, finds and summarizes customer sentiment about that brand across the web.

Your job:
1. Search the web for reviews, rating sites, analytics reports, social media mentions, and news articles about the input brand.
2. Retrieve at least the top 100–200 distinct, credible sources (Trustpilot, ConsumerAffairs, Comparably, Kimola, Reviews.io, etc.).
3. For each source:
   • Identify the Source name and URL.
   • Classify the Source Category: “Official Brand Site”, “Review Platform”, “Analytics / Research”, “Media / Newsletter”, “Social Media” etc.
   • Extract the number of reviews and rating info (if both areavailable).
   • Summarize customer sentiment divided into:
       - Positive: main points of praise.
       - Negative: main points of complaint.
4. After listing the rows, aggregate all rows into an “Overall Sentiment” section at the top:
   • Overall Sentiment (Mixed / Mostly Positive / Mostly Negative).
   • Approximate Sentiment Score /10 (based on average ratings and tone).
   • Bullet list of common Positive Sentiment Points.
   • Bullet list of common Negative Sentiment Points.

Output strictly in this Markdown table format:

## Overall Sentiment (Brand Name)
| Overall Sentiment | Sentiment Score /10 |
| --- | --- |
| … | … |

## Positive Sentiment Points
- …

## Negative Sentiment Points
- …

## Table of Sources
| Source | Category | Number of Reviews / Rating Info | Customer Sentiment Summary |
| --- | --- | --- | --- |
| **[Source Name]([Exact Page URL])** | [Category] | [Number of Reviews / Ratings] | **Positive:** … <br> **Negative:** … |

Linking requirement for Source column:
- The hyperlink MUST point to the exact page URL where the data was extracted (e.g., specific review page), NOT the site's homepage or a top-level domain.

Do not include anything else outside this format.
If some information is not available, write “Not specified” but still keep the column.
`;

    const userPrompt = `Brand name: ${brandName}\nBrand website: ${brandWebsite}\nFetch customer sentiment across the web in the specified format.`;

    let markdown = '';

    // Try OpenAI Responses API with web_search tool when enabled
    const useWebSearch = process.env.OPENAI_USE_WEB_SEARCH === '1';
    try {
      type ResponsesClient = { create: (args: unknown) => Promise<unknown> };
      const maybeResponses: ResponsesClient | undefined =
        (openai as unknown as { responses?: ResponsesClient }).responses;

      if (useWebSearch && maybeResponses?.create) {
        const resp = await maybeResponses.create({
          model: 'gpt-4o',
          tools: [{ type: 'web_search' }],
          temperature: 0.0,
          input: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        } as unknown);

        const getPath = (obj: unknown, path: string[]): unknown => {
          let cur: unknown = obj;
          for (const key of path) {
            if (typeof cur === 'object' && cur !== null) {
              const rec = cur as Record<string, unknown>;
              cur = key in rec ? rec[key] : undefined;
            } else {
              return undefined;
            }
          }
          return cur;
        };

        const candidateStrings: Array<unknown> = [
          getPath(resp, ['output_text']),
          getPath(resp, ['content', '0', 'text']),
          getPath(resp, ['choices', '0', 'message', 'content']),
        ];
        const found = candidateStrings.find((v) => typeof v === 'string');
        markdown = (found as string | undefined) ?? '';
      }
    } catch (e) {
      console.error('responses.create with web_search failed; falling back', e);
    }

    if (!markdown) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.0
      });
      markdown = completion.choices[0].message?.content ?? '';
    }

    return NextResponse.json({ markdown });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
