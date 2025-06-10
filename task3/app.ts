import express from "express";
import { promises as fs } from "fs";
import { OpenAIService } from "./OpenAIService";
import type {
  ChatCompletionMessageParam,
  ChatCompletion,
} from "openai/resources/chat/completions";

const app = express();
const port = 3000;

app.use(express.json());

// Placeholder for processing the static JSON file
async function processJsonFile() {
  try {
    const filePath = "c:/aidevs/i-am-alice/3rd-devs/task3/questions.json";
    const fileContent = await fs.readFile(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Find all test questions
    const testQuestions = jsonData["test-data"]
      .filter((item: any) => item.test && item.test.q)
      .map((item: any) => item.test.q);

    if (testQuestions.length > 20) {
      console.log("Too many tests found. Terminating method.");
      return;
    }

    console.log("Test questions:", testQuestions);

    // Identify and correct calculation errors
    const openaiService = new OpenAIService();
    await Promise.all(
      jsonData["test-data"].map(async (item: any) => {
        if (item.question && item.answer) {
          const [num1, num2] = item.question.split(" + ").map(Number);
          const correctAnswer = num1 + num2;
          if (item.answer !== correctAnswer) {
            console.log(`Correcting error in question: ${item.question}`);
            item.answer = correctAnswer;
          }
        }

        // If the item contains a test, use AI to fix the answer
        if (item.test && item.test.q) {
          const messages: ChatCompletionMessageParam[] = [
            {
              role: "system",
              content:
                "You are an AI assistant. Answer the following question concisely.",
            },
            { role: "user", content: item.test.q },
          ];
          const response = (await openaiService.completion(
            messages
          )) as ChatCompletion;
          item.test.a = response.choices[0].message.content;
          console.log(`Updated test answer for question: ${item.test.q}`);
        }
      })
    );

    // Save the corrected data to answers.json
    const outputPath = "c:/aidevs/i-am-alice/3rd-devs/task3/answers.json";
    await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2), "utf-8");
    console.log(`Corrected answers saved to ${outputPath}`);

    console.log("Processing complete.");
  } catch (error) {
    console.error("Error processing the JSON file:", error);
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    await processJsonFile();

    res.status(200).json({ message: "File processed successfully." });
  } catch (error) {
    console.error("Error in /api/process endpoint:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(port, () => {
  console.log(`Task 3 server running at http://localhost:${port}`);
});
