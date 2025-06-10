import express from "express";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import { WebSearchService } from "./WebSearch";

import { promises as fs } from "fs";
const axios = require("axios");
type Role = "user" | "assistant" | "system";
type Message = Omit<ChatCompletionMessageParam, "role"> & { role: Role };

interface SearchResult {
  url: string;
  title: string;
  description: string;
  content?: string;
}

const allowedDomains = [
  { name: "Target website", url: "xyz.ag3nts.org", scrappable: true },
];

/*
Start Express server
*/
const app = express();
const port = 3000;
app.use(express.json());
app.listen(port, () =>
  console.log(
    `Server running at http://localhost:${port}. Listening for POST /api/chat requests`
  )
);

const webSearchService = new WebSearchService(allowedDomains);
const openaiService = new OpenAIService();

app.post("/api/chat", async (req, res) => {
  console.log("Received request");

  const { message } = req.body;

  if (!message) {
    console.error("Invalid or missing 'message' in request body");
    console.error(req.body);
    return res
      .status(400)
      .json({ error: "Invalid or missing 'message' in request body" });
  }

  try {
    console.log("Preparing to scrape URLs");
    const scrapedContent = await webSearchService.scrapeUrls([
      "https://xyz.ag3nts.org/",
    ]);
    console.log("Scraped content:", scrapedContent);
    //find  question from html like this <p id="human-question">Question:<br>Rok upadku cesarstwa rzymskiego?</p>
    let question: string = "";
    const item = scrapedContent[0];
    if (item.content) {
      const questionRegex = /Question:\s*\n\n(.*?)\n\n/;
      const match = questionRegex.exec(item.content);
      if (match && match[1]) {
        question = match[1].trim();
        console.log("Extracted question:", question);
      } else {
        console.log("No question found in the content of:", item.url);
        return;
      }
    }

    const userMessage: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "Answer as simply as possible",
        name: "Alice",
      },
      { role: "user", content: question, name: "Cezary" },
    ];

    openaiService
      .completion(userMessage, "gpt-4", false, false)
      .then(async (completion) => {
        let answer = "";

        if (
          completion &&
          typeof (completion as AsyncIterable<ChatCompletionChunk>)[
            Symbol.asyncIterator
          ] === "function"
        ) {
          for await (const chunk of completion as AsyncIterable<ChatCompletionChunk>) {
            if (
              chunk.choices &&
              chunk.choices[0].delta &&
              chunk.choices[0].delta.content
            ) {
              answer += chunk.choices[0].delta.content;
            }
          }
        } else if ("choices" in (completion as ChatCompletion)) {
          answer =
            (completion as ChatCompletion).choices[0].message.content || "";
        }

        console.log("Generated answer:", answer);

        try {
          console.log(
            "Posting to xyz.ag3nts.org with data:",
            `username=tester&password=574e112a&answer=${encodeURIComponent(answer)}`
          );
          const response = await axios.post(
            "https://xyz.ag3nts.org",
            `username=tester&password=574e112a&answer=${encodeURIComponent(answer)}`,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
          console.log("Response from xyz.ag3nts.org:", response.data);

          const flgRegex = /FLG:([^<]+)/;
          const flgMatch = flgRegex.exec(response.data);
          if (flgMatch && flgMatch[1]) {
            const flgValue = flgMatch[1].trim();
            console.log("Extracted FLG value:", flgValue);
            return res.json({ flg: flgValue });
          } else {
            console.log("No FLG value found in the response.");
            return res.json({ message: "No FLG value found in the response." });
          }
        } catch (postError) {
          console.error("Error posting to xyz.ag3nts.org:", postError);
        }
      })
      .catch((error) => {
        console.error("Error generating completion:", error);
      });
  } catch (error) {
    console.error("Error in chat processing:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});
