import express from "express";
import { fetchCenzuraTxt } from "./fetchCenzuraTxt.js";
import { OpenAIService } from "./OpenAIService.js";
import { reportCensoredText } from "./reportCensoredText.js";

const app = express();
const port = 3000;

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  console.log("Received request");
  const apiKey = process.env.PERSONAL_API_KEY;
  if (!apiKey) {
    console.error("Please set your API_KEY environment variable.");
    return res.status(400).json({ error: "API_KEY not set" });
  }
  try {
    const txt = await fetchCenzuraTxt(apiKey);
    console.log("Contents of cenzura.txt:", txt);
    const openaiService = new OpenAIService();
    // Wywołanie AI z promptem systemowym i tekstem pliku
    const completion = await openaiService.completion(txt);
    let censoredText = "";
    // Obsługa tylko odpowiedzi typu ChatCompletion
    if (
      completion &&
      typeof completion === "object" &&
      "choices" in completion
    ) {
      censoredText = completion.choices[0]?.message?.content || "";
    } else if (typeof completion === "string") {
      censoredText = completion;
    } else {
      censoredText = "[Brak odpowiedzi AI]";
    }
    console.log("Censored response:", censoredText);
    // Wyślij do API
    const reportResponse = await reportCensoredText(apiKey, censoredText);
    console.log("Report API response:", reportResponse);
    res.status(200).json({ censored: censoredText, report: reportResponse });
  } catch (error) {
    console.error(
      "Error fetching cenzura.txt, calling OpenAI, or reporting:",
      error
    );
    res
      .status(500)
      .json({ error: "Failed to process or report censored text" });
  }
});

app.listen(port, () => {
  console.log(`Task 4 server running at http://localhost:${port}`);
});
