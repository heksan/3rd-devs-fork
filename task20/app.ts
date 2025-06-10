import express from "express";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAIService } from "./OpenAIService";
import {
  fetchPDFBuffer,
  extractTextFromPDF,
  extractPage19AsImage,
  ocrImage,
  fetchQuestionsJSON,
} from "./getDocUtils";
import fs from "fs/promises";

const app = express();
const port = 3000;
app.use(express.json());

const openaiService = new OpenAIService();

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  try {
    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: message },
    ];
    const completion = await openaiService.completion(messages, "gpt-4o");
    const response = completion.choices[0].message.content;
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: "Failed to get completion" });
  }
});

app.post("/api/getDoc", async (req, res) => {
  try {
    // 1. Use already downloaded PDF and image
    const pdfBuffer = await fs.readFile(__dirname + "/notebook_downloaded.pdf");
    // 2. Extract text from pages 1-18
    const text1to18 = await extractTextFromPDF(pdfBuffer);
    // 3. OCR page 19 from image.png
    //THIS SUX const ocrText = await ocrImage(__dirname + "/image.png");
    const ocrText = await ocrWithGpt4o(__dirname + "/image.png");
    // 4. Combine
    const fullText = text1to18 + "\n\n[OCR page 19]\n" + ocrText;
    // 5. Save full text and image to files (overwrite)
    await fs.writeFile(__dirname + "/notebook_fulltext.txt", fullText, "utf-8");

    res.type("application/xml").send(fullText);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Use GPT-4o vision to extract text from an image
async function ocrWithGpt4o(imagePath: string): Promise<string> {
  const fs = await import("fs/promises");
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString("base64");
  // Use a clear Polish prompt for OCR
  const prompt =
    "Oopisz dokładnie obrazek, skupiając się na tekście i szczegółach. ";
  try {
    // Use the describeMap method as inspiration
    const response = await openaiService.describeMap(base64Image, prompt);
    return response;
  } catch (err) {
    return `[ERROR: ${err instanceof Error ? err.message : err}]`;
  }
}

app.post("/api/answer", async (req, res) => {
  try {
    // 1. Load notebook content as context
    const notebookText = await fs.readFile(
      __dirname + "/notebook_fulltext.txt",
      "utf-8"
    );
    // 2. Fetch questions
    const questionsObj = await fetchQuestionsJSON();
    console.log("[api/answer] Questions loaded:", questionsObj);
    if (!questionsObj || typeof questionsObj !== "object")
      throw new Error("Questions JSON is not an object");
    const questionKeys = Object.keys(questionsObj);
    // 3. For each question, answer using OpenAIService with notebookText as context
    const answers = [];
    for (let i = 0; i < questionKeys.length; i++) {
      const key = questionKeys[i];
      const questionText = questionsObj[key];
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `Odpowiadaj na pytanie na podstawie poniższych notatek. Odpowiadaj po polsku. Jeśli nie ma odpowiedzi, napisz 'Brak odpowiedzi w notatkach.'\n\nNOTATKI:\n${notebookText}`,
        },
        { role: "user", content: questionText },
      ];
      const completion = await openaiService.completion(messages, "gpt-4o");
      const answer = completion.choices[0]?.message?.content?.trim() || "";
      answers.push({ key, question: questionText, answer });
    }
    // 4. Prepare answers object for API
    const answersObj = {};
    for (let i = 0; i < answers.length; i++) {
      answersObj[answers[i].key] = answers[i].answer;
    }
    const payload = {
      task: "notes",
      apikey: "1290eb68-2031-404f-bfda-cf5dcd1a263d",
      answer: answersObj,
    };
    console.log(
      "[api/answer] Sending payload to report:",
      JSON.stringify(payload, null, 2)
    );
    // 5. Send to remote endpoint
    const fetch = (await import("node-fetch")).default;
    let reportRes = await fetch("https://c3ntrala.ag3nts.org/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let reportText = await reportRes.text();
    console.log("[api/answer] Response from report:", reportText);
    let reportJson;
    try {
      reportJson = JSON.parse(reportText);
    } catch {
      reportJson = null;
    }
    // If response includes a hint for a specific question, retry that question with the hint
    let retried = false;
    if (
      reportJson &&
      reportJson.code === -340 &&
      reportJson.hint &&
      reportJson.message
    ) {
      const match = /question (\d+)/.exec(reportJson.message);
      if (match) {
        const qKey = match[1].padStart(2, "0");
        const origQ = questionsObj[qKey];
        const hint = reportJson.hint;
        console.log(`[api/answer] Retrying question ${qKey} with hint:`, hint);
        const retryMessages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: `Odpowiadaj na pytanie na podstawie poniższych notatek. Odpowiadaj po polsku. Jeśli nie ma odpowiedzi, napisz 'Brak odpowiedzi w notatkach.'\n\nNOTATKI:\n${notebookText}`,
          },
          { role: "user", content: origQ + "\n\nPODPOWIEDŹ: " + hint },
        ];
        const retryCompletion = await openaiService.completion(
          retryMessages,
          "gpt-4o"
        );
        const retryAnswer =
          retryCompletion.choices[0]?.message?.content?.trim() || "";
          //log retry answer
        console.log(`[api/answer] Retried answer for question ${qKey}:`, retryAnswer);
        (answersObj as Record<string, string>)[qKey] = retryAnswer;
        retried = true;
      }
    }
    // If any retry was performed, repeat the process for all questions with their latest answers
    if (retried) {
      for (let i = 0; i < questionKeys.length; i++) {
        const key = questionKeys[i];
        const questionText = questionsObj[key];
        const messages: ChatCompletionMessageParam[] = [
          {
            role: "system",
            content: `Odpowiadaj na pytanie na podstawie poniższych notatek. Odpowiadaj po polsku. Jeśli nie ma odpowiedzi, napisz 'Brak odpowiedzi w notatkach.'\n\nNOTATKI:\n${notebookText}`,
          },
          { role: "user", content: questionText },
        ];
        const completion = await openaiService.completion(messages, "gpt-4o");
        const answer = completion.choices[0]?.message?.content?.trim() || "";
        (answersObj as Record<string, string>)[key] = answer;
      }
      const retryPayload = {
        task: "notes",
        apikey: "1290eb68-2031-404f-bfda-cf5dcd1a263d",
        answer: answersObj,
      };
      console.log(
        `[api/answer] Resending payload for all questions after retry:`,
        JSON.stringify(retryPayload, null, 2)
      );
      reportRes = await fetch("https://c3ntrala.ag3nts.org/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryPayload),
      });
      reportText = await reportRes.text();
      console.log(
        `[api/answer] Response after retry for all questions:`,
        reportText
      );
    }
    // 6. Return answers as XML-based notebook cells (one per answer)
    let xml = "";
    for (let i = 0; i < answers.length; i++) {
      xml += `<VSCode.Cell language=\"markdown\">\n<b>Pytanie ${answers[i].key}:</b> ${answers[i].question}\n\n<b>Odpowiedź:</b> ${answers[i].answer}\n</VSCode.Cell>\n`;
    }
    res.type("application/xml").send(xml);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.listen(port, () =>
  console.log(
    `Server running at http://localhost:${port}. Listening for POST /api/chat requests`
  )
);
