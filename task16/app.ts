import express from "express";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import dotenv from "dotenv";

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

dotenv.config();

const openaiService = new OpenAIService();

app.post("/api/chat2", async (req, res) => {
    const imagesDir = "images";

  const base64Images: string[] = [];
  for (const file of ["IMG_1444.PNG", "IMG_1410_FXER.PNG", "IMG_1443_FT12.PNG", "IMG_559_NRR7.PNG"]) {
    try {
      const imageBuffer = await fs.readFile(`${imagesDir}/${file}`);
      base64Images.push(imageBuffer.toString("base64"));
    } catch (err) {
      console.error(`Failed to read image ${file}:`, err);
    }
  }
  const barbaraDescriptions =
      await openaiService.describeBarbara2(base64Images);
    console.log("Barbara descriptions:", barbaraDescriptions);
  });


app.post("/api/chat", async (req, res) => {
  console.log("Received request");
  const apiKey = process.env.PERSONAL_API_KEY;
  if (!apiKey) throw new Error("PERSONAL_API_KEY not set in .env");
  const payload = {
    task: "photos",
    apikey: apiKey,
    answer: "START",
  };
  const reportResponse = await axios.post(
    "https://c3ntrala.ag3nts.org/report",
    payload,
    { headers: { "Content-Type": "application/json" } }
  );
  console.log("Report response:", reportResponse.data.message);

  try {
    // Prepare a system prompt
    const systemPrompt = `Please list url to images from the message below. return them as list of urls. do not return anything else`;

    // Use OpenAIService to generate a response
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: reportResponse.data.message },
    ];

    const aiResponse = (await openaiService.completion(
      messages
    )) as ChatCompletion;
    // Log the AI response
    const aiContent = aiResponse.choices[0].message.content ?? "";
    console.log("AI Response:", aiContent);

    // Download images from the AI response
    let imageUrls: string[] = [];
    try {
      // Try to parse as JSON array if possible
      if (aiContent.trim().startsWith("[")) {
        imageUrls = JSON.parse(aiContent);
      } else {
        imageUrls = aiContent
          .split(/\r?\n/)
          .map((url: string) => url.trim())
          .filter(
            (url: string) => url.startsWith("http") && url.endsWith(".PNG")
          );
      }
    } catch (e) {
      imageUrls = aiContent
        .split(/\r?\n/)
        .map((url: string) => url.trim())
        .filter(
          (url: string) => url.startsWith("http") && url.endsWith(".PNG")
        );
    }

    const imagesDir = "images";
    await fs.mkdir(imagesDir, { recursive: true });

    let actions: { filename: string; action: string }[] = [];
    let processedImageNames: string[] = [];
    let loopCount = 0;
    let finalImages: string[] = [];
    do {
      actions = await getImageActions(imageUrls, imagesDir, openaiService);
      console.log(`Image actions (iteration ${loopCount + 1}):`, actions);
      // Add images with OK to finalImages if not already present, and remove them from actions
      actions = actions.filter((a) => {
        if (
          a.action.trim().toUpperCase() === "OK" &&
          !finalImages.includes(a.filename)
        ) {
          finalImages.push(a.filename);
          return false; // Remove from actions
        }
        return true; // Keep in actions
      });
      // If all actions are OK (actions is empty), break
      if (actions.length === 0) break;
      processedImageNames = await processImages(actions);
      imageUrls = processedImageNames.map(
        (name) => `https://centrala.ag3nts.org/dane/barbara/${name}`
      );
      //log all processed image urls
      console.log(
        `Processed image URLs (iteration ${loopCount + 1}):`,
        imageUrls
      );
      loopCount++;
    } while (loopCount < 3 && actions.length > 0);

    // After loop, add any remaining images to finalImages if not already present
    for (const a of actions) {
      if (!finalImages.includes(a.filename)) {
        finalImages.push(a.filename);
      }
    }

    // After loop, log final filenames
    console.log("Final filenames:", finalImages);

    // Use describeBarbara with final filenames
    const finalFiles = finalImages;
    const base64Images: string[] = [];
    for (const file of finalFiles) {
      try {
        const imageBuffer = await fs.readFile(`${imagesDir}/${file}`);
        base64Images.push(imageBuffer.toString("base64"));
      } catch (err) {
        base64Images.push("");
        console.error(`Failed to read file for Barbara description: ${imagesDir}/${file}`);
      }
    }
    const barbaraDescriptions =
      await openaiService.describeBarbara(base64Images);
    console.log("Barbara descriptions:", barbaraDescriptions);

    // Send the required payload to c3ntrala.ag3nts.org/report

    res.status(200).json({
      message: "AI response",
      aiResponse,
      report: reportResponse.data,
    });
  } catch (error: any) {
    console.error(
      "Error during verification or AI response generation:",
      error.message
    );
    res.status(500).json({ error: "Internal server error" });
  }
});
async function getImageActions(
  imageUrls: string[],
  imagesDir: string,
  openaiService: OpenAIService
): Promise<{ filename: string; action: string }[]> {
  const fs = require("fs").promises;
  const axios = require("axios");
  const actions: { filename: string; action: string }[] = [];
  for (const url of imageUrls) {
    try {
      const urlParts = url.split("/");
      const originalName = urlParts[urlParts.length - 1].split("?")[0];
      const filePath = `${imagesDir}/${originalName}`;
      const response = await axios.get(url, { responseType: "arraybuffer" });
      await fs.writeFile(filePath, response.data);
      console.log(`Downloaded: ${filePath}`);

      // Read file and convert to base64
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString("base64");
      // Use describeImageWithContext
      const action = await openaiService.describeImageWithContext(base64Image);
      actions.push({ filename: originalName, action }); // Use only the filename
    } catch (err) {
      if (err instanceof Error) {
        console.error(`Failed to download or process ${url}:`, err.message);
      } else {
        console.error(`Failed to download or process ${url}:`, err);
      }
    }
  }
  return actions;
}
async function processImages(
  actions: { filename: string; action: string }[]
): Promise<string[]> {
  const axios = require("axios");
  const apiKey = process.env.PERSONAL_API_KEY;
  if (!apiKey) throw new Error("PERSONAL_API_KEY not set in .env");
  const validActions = ["REPAIR", "DARKEN", "BRIGHTEN"];
  const urls: string[] = [];
  for (const { filename, action } of actions) {
    //log the action and filename
    console.log(`Processing ${filename} with action: ${action}`);
    if (validActions.includes(action)) {
      const imgName = filename.split("/").pop();
      const payload = {
        task: "photos",
        apikey: apiKey,
        answer: `${action} ${imgName}`,
      };
      try {
        const response = await axios.post(
          "https://c3ntrala.ag3nts.org/report",
          payload,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log(`Reported action for ${imgName}:`, response.data);

        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content:
              "name of the image image from the message below. return name ONLY. do not return anything else",
          },
          { role: "user", content: response.data.message },
        ];

        const aiResponse = (await openaiService.completion(
          messages
        )) as ChatCompletion;
        // Log the AI response
        const aiContent = aiResponse.choices[0].message.content ?? "";
        console.log("AI Response:", aiContent);
        urls.push(aiContent.trim());
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Failed to report action for ${imgName}:`, err);
        } else {
          console.error(`Failed to report action for ${imgName}:`, err);
        }
      }
    }
  }
  return urls;
}
