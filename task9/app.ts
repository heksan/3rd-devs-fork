import express from "express";
import { OpenAIService } from "./OpenAIService";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { downloadAndExtractZip, getFilteredFilesMap } from "./fileHandler";
import fs from "fs";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }

  try {
    // Ensure files are downloaded and extracted
    //await downloadAndExtractZip();
    const filesMap = getFilteredFilesMap();
    const results: Record<string, string> = {};
    const openaiService = new OpenAIService();
    const people: { filename: string; text: string }[] = [];
    const hardware: { filename: string; text: string }[] = [];

    for (const [filename, filepath] of Object.entries(filesMap)) {
      const ext = filename.split(".").pop()?.toLowerCase();
      let text = "";
      if (ext === "txt") {
        text = fs.readFileSync(filepath, "utf-8");
        console.log(`[EXTRACTED][TXT] ${filename}:`, text);
      } else if (ext === "png") {
        const imageBuffer = fs.readFileSync(filepath);
        try {
          const prompt =
            "Extract all visible text from this image. Return only the text, no commentary.";
          const base64Image = imageBuffer.toString("base64");
          text = await openaiService.visionExtractTextFromImage(
            base64Image,
            prompt
          );
          console.log(`[EXTRACTED][PNG] ${filename}:`, text);
        } catch (err) {
          text = `[ERROR: ${err instanceof Error ? err.message : err}]`;
          console.log(`[EXTRACTED][PNG][ERROR] ${filename}:`, text);
        }
      } else if (ext === "mp3") {
        const audioBuffer = fs.readFileSync(filepath);
        try {
          text = await openaiService.transcribeGroq(audioBuffer);
          console.log(`[EXTRACTED][MP3] ${filename}:`, text);
        } catch (err) {
          text = `[ERROR: ${err instanceof Error ? err.message : err}]`;
          console.log(`[EXTRACTED][MP3][ERROR] ${filename}:`, text);
        }
      }
      if (text && !text.startsWith("[ERROR")) {
        // Categorize using GPT
        const catPrompt = `Kategoria: Na podstawie poniższego tekstu zdecyduj, czy plik zawiera informacje o:\n\nLudziach: Uwzględniaj tylko notatki zawierające informacje o schwytanych ludziach lub o śladach ich obecności.\nHardware: Usterki hardwarowe (nie software).\n\nJeśli plik nie pasuje do żadnej z powyższych kategorii, odpowiedz "none".\n\nTekst:\n${text}\n\nOdpowiedz tylko jednym słowem: people, hardware lub none.`;
        const catResp = await openaiService.completion(
          catPrompt,
          "gpt-4o",
          false,
          false
        );
        let category = "none";
        if (
          typeof catResp === "object" &&
          "choices" in catResp &&
          catResp.choices[0]?.message?.content
        ) {
          category = catResp.choices[0].message.content.trim().toLowerCase();
        } else if (typeof catResp === "string") {
          category = String(catResp).trim().toLowerCase();
        }
        console.log(`[CATEGORY] ${filename}:`, category);
        if (category === "people") {
          people.push({ filename, text });
        } else if (category === "hardware") {
          hardware.push({ filename, text });
        }
      }
    }

    // Prepare sorted JSON result
    const apiKey = process.env.PERSONAL_API_KEY;
    const sortedPeople = people
      .map((p) => p.filename)
      .sort((a, b) => a.localeCompare(b));
    const sortedHardware = hardware
      .map((h) => h.filename)
      .sort((a, b) => a.localeCompare(b));
    const result = {
      task: "kategorie",
      apikey: apiKey,
      answer: {
        people: sortedPeople,
        hardware: sortedHardware,
      },
    };

    // Send result to external API
    try {
      const reportRes = await fetch("https://c3ntrala.ag3nts.org/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const reportData = await reportRes.json();
      res.status(200).json({ ...result, report: reportData });
    } catch (err) {
      res.status(200).json({
        ...result,
        report: `[ERROR: ${err instanceof Error ? err.message : err}]`,
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to process files" });
  }
});

app.post("/api/files/fetch", async (req, res) => {
  try {
    const files = await downloadAndExtractZip();
    res.status(200).json({ files });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch or extract files" });
  }
});

app.listen(port, () => {
  console.log(`Task9 API listening at http://localhost:${port}`);
});
