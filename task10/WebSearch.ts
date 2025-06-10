import FirecrawlApp from "@mendable/firecrawl-js";
import type { ScrapeResponse } from "@mendable/firecrawl-js";
import type OpenAI from "openai";
import { OpenAIService } from "./OpenAIService";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// New type definition
type SearchNecessityResponse = 0 | 1;

export class WebSearchService {
  private openaiService: OpenAIService;
  private allowedDomains: { name: string; url: string; scrappable: boolean }[];
  private apiKey: string;
  private firecrawlApp: FirecrawlApp;

  constructor(
    allowedDomains: { name: string; url: string; scrappable: boolean }[]
  ) {
    this.openaiService = new OpenAIService();
    this.allowedDomains = allowedDomains;
    this.apiKey = process.env.FIRECRAWL_API_KEY || "";
    this.firecrawlApp = new FirecrawlApp({ apiKey: this.apiKey });
  }

  async scrapeUrl(url: string): Promise<{ url: string; content: string }> {
    // Filter out URLs that are not scrappable based on allowedDomains

    const scrapeResult = (await this.firecrawlApp.scrapeUrl(url, {
      formats: ["markdown"],
    })) as ScrapeResponse;
    const mapResult = (await this.firecrawlApp.mapUrl(url)) as ScrapeResponse;
    if (scrapeResult && scrapeResult.markdown) {
      console.log("scrapeResult:", scrapeResult);
      // Save scrapeResult.markdown to file
      const fs = await import("fs/promises");
      const path = await import("path");
      const scrapeDir = path.resolve(__dirname, "scrape");
      await fs.mkdir(scrapeDir, { recursive: true });
      await fs.writeFile(
        path.join(scrapeDir, `scraperesult.md`),
        scrapeResult.markdown,
        "utf-8"
      );
    }
    if (mapResult) {
      console.log("scrapeResult:", mapResult);
      // Save mapResult to file
      const fs = await import("fs/promises");
      const path = await import("path");
      const scrapeDir = path.resolve(__dirname, "scrape");
      await fs.mkdir(scrapeDir, { recursive: true });
      await fs.writeFile(
        path.join(scrapeDir, `mapresult.json`),
        JSON.stringify(mapResult, null, 2),
        "utf-8"
      );
    }

    return { url, content: "" };
  }
}
