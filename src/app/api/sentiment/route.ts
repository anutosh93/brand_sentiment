import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { RedditScraper, RedditPost } from '@/lib/reddit-scraper';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const redditScraper = new RedditScraper();
  
  try {
    const { brandName, brandWebsite } = await req.json();

    console.log(`Starting Reddit analysis for brand: ${brandName}`);

    // Step 1: Scrape Reddit for brand mentions
    const posts = await redditScraper.searchReddit(brandName, 50);
    console.log(`Found ${posts.length} Reddit posts`);

    if (posts.length === 0) {
      return NextResponse.json({ 
        markdown: generateNoDataMarkdown(brandName)
      });
    }

    // Step 2: Use OpenAI to analyze sentiment
    const sentimentAnalysis = await analyzeSentimentWithOpenAI(brandName, posts);
    
    return NextResponse.json({ markdown: sentimentAnalysis, posts });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Reddit scraping error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    // No cleanup needed; RedditScraper uses direct JSON endpoints
  }
}

async function analyzeSentimentWithOpenAI(brandName: string, posts: RedditPost[]): Promise<string> {
  // Prepare the data for OpenAI analysis
  const postsData = posts.map(post => ({
    title: post.title,
    content: post.content,
    subreddit: post.subreddit,
    upvotes: post.upvotes,
    comments: post.comments,
    url: post.url,
    topComments: (post.topComments || []).slice(0, 20).map(c => ({ author: c.author, score: c.score, body: c.body }))
  }));

  const systemPrompt = `
You are an AI assistant that analyzes customer sentiment from Reddit posts about brands.

Your job:
1. Analyze the provided Reddit posts about "${brandName}"
2. For each post, determine sentiment (Positive/Negative/Neutral) and extract key sentiment points
3. Aggregate all posts into an overall sentiment analysis
4. Generate a comprehensive report in the specified markdown format

Guidelines for sentiment analysis:
- Consider context, tone, and specific mentions about the brand
- Look for satisfaction/dissatisfaction indicators
- Identify specific praise or criticism
- Consider upvotes/comments as engagement indicators
- Be objective and balanced in your assessment

Output strictly in this Markdown format:

## Overall Sentiment (${brandName} - Reddit Analysis)
| Overall Sentiment | Sentiment Score /10 | Total Posts Analyzed |
| --- | --- | --- |
| [Mostly Positive/Mixed/Mostly Negative] | [X.X] | [Number] |

## Positive Sentiment Points
- [Key positive themes from the posts]
- [Another positive theme]
- [etc.]

## Negative Sentiment Points  
- [Key negative themes from the posts]
- [Another negative theme]
- [etc.]

## Sentiment Distribution
- **Positive Posts:** [Number] ([Percentage]%)
- **Negative Posts:** [Number] ([Percentage]%)
- **Neutral Posts:** [Number] ([Percentage]%)

## Table of Reddit Sources
| Source | Category | Engagement | Customer Sentiment Summary |
| --- | --- | --- | --- |
| **[Post Title](URL)** | Reddit - r/[subreddit] | [X upvotes, Y comments] | **[Positive/Negative/Mixed]:** [Brief analysis of the post sentiment with key points] <br> [View Comments](/comments?u=URL) |

Make sure each post gets its own row with proper sentiment analysis.
`;

  const userPrompt = `Please analyze the sentiment of these ${posts.length} Reddit posts about "${brandName}":

${JSON.stringify(postsData, null, 2)}

Provide a comprehensive sentiment analysis in the specified markdown format.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 4000
    });

    return completion.choices[0].message?.content ?? 'Error analyzing sentiment';
  } catch (error) {
    console.error('OpenAI sentiment analysis error:', error);
    return generateFallbackAnalysis(brandName, posts);
  }
}

function generateFallbackAnalysis(brandName: string, posts: RedditPost[]): string {
  // Fallback analysis if OpenAI fails
  return `## Overall Sentiment (${brandName} - Reddit Analysis)
| Overall Sentiment | Sentiment Score /10 | Total Posts Analyzed |
| --- | --- | --- |
| Analysis in Progress | N/A | ${posts.length} |

## Positive Sentiment Points
- Analysis temporarily unavailable due to API limitations

## Negative Sentiment Points
- Analysis temporarily unavailable due to API limitations

## Sentiment Distribution
- **Total Posts Found:** ${posts.length}
- **Analysis Status:** Please try again - temporary processing issue

## Table of Reddit Sources
| Source | Category | Engagement | Customer Sentiment Summary |
| --- | --- | --- | --- |
${posts.map(post => {
  const engagement = `${post.upvotes} upvotes, ${post.comments} comments`;
  return `| **[${post.title}](${post.url})** | Reddit - r/${post.subreddit} | ${engagement} | **Summary:** Post captured; analysis pending <br> [View Comments](/comments?u=${encodeURIComponent(post.url)}) |`;
}).join('\n')}

**Note:** Sentiment analysis temporarily unavailable. Raw data collected successfully from ${posts.length} Reddit posts.`;
}

function generateNoDataMarkdown(brandName: string): string {
  return `## Overall Sentiment (${brandName} - Reddit Analysis)
| Overall Sentiment | Sentiment Score /10 | Total Posts Analyzed |
| --- | --- | --- |
| No Data Available | N/A | 0 |

## Positive Sentiment Points
- No data available - brand may have limited Reddit presence

## Negative Sentiment Points
- No data available - brand may have limited Reddit presence

## Table of Reddit Sources
| Source | Category | Engagement | Customer Sentiment Summary |
| --- | --- | --- | --- |
| No Reddit posts found | Reddit Analysis | N/A | No significant Reddit discussions found for this brand. This could indicate limited Reddit presence or the brand name may need refinement. |

**Note:** No relevant Reddit posts were found for "${brandName}". This could be due to:
- Limited Reddit presence for this brand
- Brand name variations not captured
- Recent posts that haven't been indexed yet
- Private or restricted subreddit discussions`;
}

/* import { NextRequest, NextResponse } from 'next/server';
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
      interface ResponsesClient {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
      }
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
        });

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
 */

