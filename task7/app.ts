import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type {
  ChatCompletion,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";
import { systemPrompt } from "./systemPrompt";
import { OpenAIService } from "./OpenAIService";

const openAIService = new OpenAIService();

async function processImages(): Promise<void> {
  const imageFolder = join(__dirname, "obrazy");
  const files = await readdir(imageFolder);
  const pngFiles = files.filter((file) => file.endsWith(".png"));

  // Read all images and prepare as chat content
  const imageContents = await Promise.all(
    pngFiles.map(async (file) => {
      const filePath = join(imageFolder, file);
      const fileData = await readFile(filePath);
      return {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${fileData.toString("base64")}`,
          detail: "high",
        },
      } as ChatCompletionContentPartImage;
    })
  );

  // Add a single user message with all images and a single text prompt
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: [
        ...imageContents,
        {
          type: "text",
          text: "Znajdź miasta na wszystkich obrazach. Uważaj, jedno miasto jest błędne.",
        } as ChatCompletionContentPartText,
      ],
    },
  ];

  const chatCompletion = (await openAIService.completion(
    messages,
    "gpt-4o",
    false,
    false,
    1024
  )) as ChatCompletion;
  console.log(chatCompletion.choices[0].message.content || "");
}

processImages();
