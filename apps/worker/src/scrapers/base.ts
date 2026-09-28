export interface DiscoveredItem {
  url: string;
  title: string;
}

export interface DetailResult {
  title: string;
  html: string;
  categoryTags: string[];
  companyGuess?: string;
  roleGuess?: string;
  cityGuess?: string;
  applyUrl?: string;  // extracted apply link for follow-up scraping
}

export interface IScraper {
  sourceId: string;
  discover(): Promise<DiscoveredItem[]>;
  scrapeDetail(url: string): Promise<DetailResult>;
}
