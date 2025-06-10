import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from "fs/promises";
import path from "path";
import FormData from "form-data";
import { createReadStream } from "fs";

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

  /**
   * Create an edited image using OpenAI's image edits API with any number of input images.
   * @param images Array of file paths to images (PNG or JPG, up to 4).
   * @param prompt The prompt describing the desired composition.
   * @param model The model to use (default: 'gpt-image-1').
   * @returns Buffer of the resulting image (PNG).
   */
  async createImageEdit({
    images,
    prompt,
    model = "gpt-image-1",
  }: {
    images: string[];
    prompt: string;
    model?: string;
  }): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set in environment");
    const axios = require("axios");

    const form = new FormData();
    form.append("model", model);
    for (const imgPath of images) {
      // OpenAI expects each image as a separate 'image[]' field, and the files must be PNGs (not JPGs)
      form.append("image[]", createReadStream(path.resolve(imgPath)), {
        filename: path.basename(imgPath),
        contentType: "image/png",
      });
    }
    form.append("prompt", prompt);

    // @ts-ignore
    const response = await axios.post(
      "https://api.openai.com/v1/images/edits",
      form,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...form.getHeaders(),
        },
      }
    );
    console.log(
      "OpenAI image edits API response:",
      JSON.stringify(response.data, null, 2)
    );
    if (response.status !== 200) {
      const err = response.data;
      throw new Error(`OpenAI image edit failed: ${JSON.stringify(err)}`);
    }
    const data = response.data;
    if (data && Array.isArray(data.data) && data.data[0]?.b64_json) {
      return Buffer.from(data.data[0].b64_json, "base64");
    }
    throw new Error("No image returned from OpenAI edits API");
  }
}
