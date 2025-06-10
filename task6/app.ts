import express from "express";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import multer from "multer";
import cors from "cors";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB in bytes
  },
});
import { promises as fs } from "fs";
import { OpenAIService } from "./OpenAIService";
import { reportCentrala } from "./reportCentrala";
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
const apiKey: string = process.env.PERSONAL_API_KEY as string;

app.use(express.json());
app.listen(port, () =>
  console.log(
    `Server running at http://localhost:${port}. Listening for POST /api/chat requests`
  )
);

const openaiService = new OpenAIService();

app.post("/api/chat", async (req, res) => {
  console.log("Received request");
  const audioDir = __dirname + "/przesluchania";
  const txtDir = __dirname + "/przesluchaniaTXT";
  try {
    // Ensure output directory exists
    await fs.mkdir(txtDir, { recursive: true });
    // Get all .m4a files
    const files = await fs.readdir(audioDir);
    const audioFiles = files.filter((f) => f.endsWith(".m4a"));
    const results = [];
    for (const file of audioFiles) {
      const filePath = audioDir + "/" + file;
      const buffer = await fs.readFile(filePath);
      const transcription = await openaiService.transcribeGroq(buffer);
      const txtFile = txtDir + "/" + file.replace(/\.m4a$/, ".txt");
      await fs.writeFile(txtFile, transcription, "utf8");
      results.push({ file: file, txt: txtFile });
    }
    res.json({ status: "done", files: results });
  } catch (err) {
    console.error("Transcription batch error:", err);
    const message = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({ error: "Batch transcription failed", details: message });
  }
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  const audioFile = req.file;
  if (!audioFile) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    // Pass the file buffer to the transcription service
    const transcription = await openaiService.transcribeGroq(audioFile.buffer);
    return res.json({ transcription });
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "An error occurred during transcription" });
  }
});

app.post("/api/chat2", async (req, res) => {
  const txtDir = __dirname + "/przesluchaniaTXT";
  try {
    // Get all .txt files
    const files = await fs.readdir(txtDir);
    const txtFiles = files.filter((f) => f.endsWith(".txt"));
    // Read and format: NAME: text\n\nNAME2: text2
    const formatted = await Promise.all(
      txtFiles.map(async (file) => {
        const name = file.replace(/\.txt$/, "");
        const content = await fs.readFile(txtDir + "/" + file, "utf8");
        // Add a separator and bold name for better formatting
        return `---\n**${name}:**\n${content.trim()}`;
      })
    );
    const userPrompt = formatted.join("\n\n");
    // Use as user prompt in completionSysPrompt
    const response = (await openaiService.completionSysPrompt(
      userPrompt
    )) as ChatCompletion;
    console.log("completionSysPrompt response:", response);
//    await reportCentrala(apiKey, response.choices[0].message.content ?? "");
    res.json({ prompt: userPrompt, response });
  } catch (err) {
    console.error("Error in /api/chat2:", err);
    const message = err instanceof Error ? err.message : String(err);
    res
      .status(500)
      .json({ error: "Failed to process chat2", details: message });
  }
});
