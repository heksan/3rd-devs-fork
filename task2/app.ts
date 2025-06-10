import express from "express";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";

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

const openaiService = new OpenAIService();

app.post("/api/chat", async (req, res) => {
  console.log("Received request");

  try {
    // Send the verification request
    const verificationResponse = await axios.post(
      "https://xyz.ag3nts.org/verify",
      {
        text: "READY",
        msgID: 0,
      }
    );

    console.log("Verification response:", verificationResponse.data);

    const messageId = verificationResponse.data.msgID;
    console.log(`Verification successful. Message ID: ${messageId}`);

    // Prepare a system prompt
    const systemPrompt = `You are an AI assistant. Always answer questions based on the following data:
      - The capital of Poland is Kraków.
      - The famous number from the book 'The Hitchhiker's Guide to the Galaxy' is 69.
      - The current year is 1999.
      
       Always answer in english. If question does not contain any of the above data, answer normally.
       Your answer should be as consice as possible, possibly 1 word`;

    // Use OpenAIService to generate a response
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: verificationResponse.data.text },
    ];

    const aiResponse = await openaiService.completion(messages) as ChatCompletion;
    //cast aiResponse to ChatCompletion

    // Log the AI response
    console.log("AI Response:", aiResponse.choices[0].message.content);

    // Send the AI response to xyz with the appropriate msgID
    const forwardResponse = await axios.post("https://xyz.ag3nts.org/verify", {
      text: aiResponse.choices[0].message.content,
      msgID: messageId,
    });

    console.log("Forward response:", forwardResponse.data);

    // Respond to the client with AI's answer
    res.status(200).json({ message: "AI response", aiResponse });
  } catch (error: any) {
    console.error(
      "Error during verification or AI response generation:",
      error.message
    );
    res.status(500).json({ error: "Internal server error" });
  }
});
