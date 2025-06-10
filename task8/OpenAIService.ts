import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(
    userText: string,
    model: string = "gpt-4o-mini",
    stream: boolean = false,
    jsonMode: boolean = false
  ): Promise<
    | OpenAI.Chat.Completions.ChatCompletion
    | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  > {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: userText,
      },
    ];
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        response_format: jsonMode ? { type: "json_object" } : { type: "text" },
      });
      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  /**
   * Generate an image using OpenAI's image generation API.
   * @param prompt The prompt describing the image.
   * @param model The model to use (default: 'gpt-image-1').
   * @param n Number of images to generate (default: 1).
   * @param size Image size (default: '1024x1024').
   * @returns An array of image URLs.
   */
  async createImage({
    prompt,
    model = "dall-e-3",
    n = 1,
    response_format = "url",
    size = "1024x1024",
  }: {
    prompt: string;
    model?: string;
    response_format?: string;
    n?: number;
    size?: string;
  }): Promise<string[]> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY not set in environment");
      const response = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, prompt, n, response_format, size }),
        }
      );
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI image generation failed: ${err}`);
      }
      const data = await response.json();
      // Extract URLs from the response
      if (data && Array.isArray(data.data)) {
        return data.data.map((item: any) => item.url).filter(Boolean);
      }
      throw new Error("No image URLs returned from OpenAI");
    } catch (error) {
      console.error("Error in OpenAI createImage:", error);
      throw error;
    }
  }
}
