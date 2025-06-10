import express from "express";
import { OpenAIService } from "./OpenAIService";
import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs/promises";
import { systemPrompt } from "./systemPrompt";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const openaiService = new OpenAIService();
  // Use createImageEdit with the two provided images and a descriptive prompt
  const images = [
    __dirname + "/imgs/electrophoresis.png",
    __dirname + "/imgs/image.png",
  ];
  const prompt =
    "Show second image in the style of first image (in color and style), make circles red or blue depending on sign in them (+ or -) Do not copy text";
  try {
    const resultBuffer = await openaiService.createImageEdit({
      images,
      prompt,
    });
    // Save the result as an image in the results folder
    const resultsDir = __dirname + "/results";
    await fs.mkdir(resultsDir, { recursive: true });
    const outPath = resultsDir + "/result.png";
    await fs.writeFile(outPath, resultBuffer);
    res
      .status(200)
      .json({ image: resultBuffer.toString("base64"), file: outPath });
  } catch (error) {
    res.status(500).json({ error: "Failed to get image or report" });
    throw error;
  }
});

app.post("/api/chat2", async (req, res) => {
  const { message } = req.body;
  const openaiService = new OpenAIService();
  // Use createImageEdit with the two provided images and a descriptive prompt
  try {
    const resultBuffer = await openaiService.createImage({
    
      prompt: systemPrompt,
    });
//result buffer is array of string, print that
    console.log(resultBuffer);
    res.status(200).json({ image: resultBuffer.toString() });
  } catch (error) {
    res.status(500).json({ error: "Failed to get image or report" });
    throw error;
  }
});

app.listen(port, () => {
  console.log(`Task8 API listening at http://localhost:${port}`);
});
