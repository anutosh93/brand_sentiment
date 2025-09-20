export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative';

export interface RecommendationLink {
  title: string;
  url: string;
}

export interface CommentInput {
  author: string;
  score: number;
  body: string;
  timestamp: string;
}

export interface PostContextInput {
  title: string;
  url: string;
  subreddit: string;
  timestamp?: string;
}

export interface RecommendationItem {
  index: number;
  sentiment: SentimentLabel;
  topics: string[];
  recommendation: string;
  links: RecommendationLink[];
  confidence: number; // 0..1
  safetyFlags: string[];
}

export interface RecommendationRequestBody {
  brandName?: string;
  brandWebsite?: string;
  post: PostContextInput;
  comments: CommentInput[];
}

export interface RecommendationResponseBody {
  recommendations: RecommendationItem[];
}


