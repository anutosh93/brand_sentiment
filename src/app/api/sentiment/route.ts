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
2. Retrieve at least the top 10–20 distinct, credible sources (Trustpilot, ConsumerAffairs, Comparably, Kimola, Reviews.io, etc.).
3. For each source:
   • Identify the Source name and URL.
   • Classify the Source Category: “Official Brand Site”, “Review Platform”, “Analytics / Research”, “Media / Newsletter”, “Social Media” etc.
   • Extract the number of reviews or rating info (if available).
   • Summarize customer sentiment divided into:
       - Positive: main points of praise.
       - Negative: main points of complaint.
4. After listing the rows, aggregate all rows into an “Overall Sentiment” section at the top:
   • Overall Sentiment (Mixed / Mostly Positive / Mostly Negative).
   • Approximate Sentiment Score /10 (based on average ratings and tone).
   • Bullet list of common Positive Sentiment Points.
   • Bullet list of common Negative Sentiment Points.

Output strictly in this Markdown table format:

### Overall Sentiment (Brand Name)
| Overall Sentiment | Sentiment Score /10 |
| --- | --- |
| … | … |

#### Positive Sentiment Points
- …

#### Negative Sentiment Points
- …

### Table of Sources
| Source | Category | Number of Reviews / Rating Info | Customer Sentiment Summary |
| --- | --- | --- | --- |
| **[Source Name]** | [Category] | [Number of Reviews / Ratings] ([URL]) | **Positive:** … <br> **Negative:** … ([URL]) |
| … more rows …

Do not include anything else outside this format.
If some information is not available, write “Not specified” but still keep the column.
`;

    const userPrompt = `Brand name: ${brandName}\nBrand website: ${brandWebsite}\nFetch customer sentiment across the web in the specified format.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-4o-mini' if you prefer
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const markdown = completion.choices[0].message?.content ?? '';

    return NextResponse.json({ markdown });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
