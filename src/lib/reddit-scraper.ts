import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface RedditPost {
  title: string;
  url: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  content: string;
  timestamp: string;
}

export class RedditScraper {
  private browser: any = null;

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async searchReddit(brandName: string, limit: number = 50): Promise<RedditPost[]> {
    await this.initBrowser();
    const page = await this.browser.newPage();
    
    try {
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const posts: RedditPost[] = [];
      
      // Search in multiple ways to get comprehensive results
      const searchQueries = [
        `site:reddit.com "${brandName}"`,
        `site:reddit.com ${brandName} review`,
        `site:reddit.com ${brandName} experience`,
        `site:reddit.com ${brandName} opinion`
      ];

      for (const query of searchQueries) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        await this.sleep(2000);

        const content = await page.content();
        const $ = cheerio.load(content);

        // Extract Reddit URLs from Google search results
        const redditUrls: string[] = [];
        $('a[href*="reddit.com/r/"]').each((i, element) => {
          const href = $(element).attr('href');
          if (href && href.includes('reddit.com/r/') && !redditUrls.includes(href)) {
            // Clean up Google redirect URLs
            const cleanUrl = href.startsWith('/url?q=') 
              ? decodeURIComponent(href.split('/url?q=')[1].split('&')[0])
              : href;
            if (cleanUrl.startsWith('http')) {
              redditUrls.push(cleanUrl);
            }
          }
        });

        // Visit each Reddit post and extract data
        for (const url of redditUrls.slice(0, 15)) { // Limit per query
          try {
            const postData = await this.scrapeRedditPost(page, url, brandName);
            if (postData) {
              posts.push(postData);
            }
            await this.sleep(1000); // Rate limiting
          } catch (error) {
            console.error(`Error scraping Reddit post ${url}:`, error);
            continue;
          }
        }

        if (posts.length >= limit) break;
        await this.sleep(2000); // Rate limiting between queries
      }

      return posts.slice(0, limit);
    } finally {
      await page.close();
    }
  }

  private async scrapeRedditPost(page: any, url: string, brandName: string): Promise<RedditPost | null> {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.sleep(2000);

      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract post data
      const title = $('[data-test-id="post-content"] h1').first().text().trim() || 
                   $('h1').first().text().trim() ||
                   $('[slot="title"]').text().trim();

      const subredditMatch = url.match(/reddit\.com\/r\/([^\/]+)/);
      const subreddit = subredditMatch ? subredditMatch[1] : 'unknown';

      // Extract upvotes
      let upvotes = 0;
      const upvoteText = $('[id*="vote-arrows"] button').first().text() || 
                        $('[data-test-id="upvotes"]').text() ||
                        $('.score').text();
      const upvoteMatch = upvoteText.match(/(\d+)/);
      if (upvoteMatch) upvotes = parseInt(upvoteMatch[1]);

      // Extract comment count
      let comments = 0;
      const commentText = $('a[data-test-id="comments-page-link"]').text() ||
                         $('a[href*="comments"]').text();
      const commentMatch = commentText.match(/(\d+)/);
      if (commentMatch) comments = parseInt(commentMatch[1]);

      // Extract post content
      const postContent = $('[data-test-id="post-content"] div[data-test-id="richtext-content"]').text() ||
                         $('.usertext-body').text() ||
                         $('[data-adclicklocation="title"] + div').text() ||
                         '';

      // Extract timestamp
      const timestamp = $('time').attr('datetime') || 
                       $('[data-test-id="post-timestamp"]').text() ||
                       new Date().toISOString();

      // Only return if the post mentions the brand and has substantial content
      const fullText = `${title} ${postContent}`.toLowerCase();
      if (fullText.includes(brandName.toLowerCase()) && (title || postContent)) {
        return {
          title: title || 'No title available',
          url,
          subreddit,
          upvotes,
          comments,
          content: postContent || title,
          timestamp
        };
      }

      return null;
    } catch (error) {
      console.error(`Error scraping Reddit post ${url}:`, error);
      return null;
    }
  }

  // Remove the analyzeSentiment method - it will be handled by OpenAI in the API route
}