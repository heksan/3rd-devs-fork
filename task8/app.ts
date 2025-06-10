import express from "express";
import { OpenAIService } from "./OpenAIService";
import fetch from "node-fetch";
import dotenv from "dotenv";

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
    // Fetch robot description
    const apiKey = process.env.PERSONAL_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "API key not set in .env (MY_API or PERSONAL_API_KEY)",
      });
    }
    const url = `https://c3ntrala.ag3nts.org/data/${apiKey}/robotid.json`;
    const robotRes = await fetch(url);
    if (!robotRes.ok) {
      return res
        .status(500)
        .json({ error: "Failed to fetch robot description" });
    }
    const robotData = await robotRes.json();
    const robotDescription = robotData.description || "";

    // Use OpenAIService to generate an image from the robot description
    const openaiService = new OpenAIService();
    const imageResponse = await openaiService.createImage({
      prompt: robotDescription,
    });
    console.log("Image generation response:", imageResponse);

    // Send the image URL(s) to the report endpoint
    const reportRes = await fetch("https://c3ntrala.ag3nts.org/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "robotid",
        apikey: apiKey,
        answer: Array.isArray(imageResponse) ? imageResponse[0] : imageResponse,
      }),
    });
    const reportData = await reportRes.json();

    res
      .status(200)
      .json({ image: imageResponse, robotDescription, report: reportData });
  } catch (error) {
    res.status(500).json({ error: "Failed to get image or report" });
  }
});

app.listen(port, () => {
  console.log(`Task8 API listening at http://localhost:${port}`);
});
