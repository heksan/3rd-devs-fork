import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { toFile } from "openai";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

export class OpenAIService {

  private openai: OpenAI;
  private groq: Groq;

  constructor() {
    this.openai = new OpenAI();
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
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

  async completionQ(
    question: string,
    context: string,
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
        content: `You are an expert assistant. First, think step by step about the answer and write your reasoning prefixed with _thinking:. Then, in a new line, provide a single-sentence answer to the question. Below is some context from a document (in markdown):\n\n---\n${context}\n---\n\n`,
      },
      {
        role: "user",
        content: question,
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

    async transcribeGroq(audioBuffer: Buffer): Promise<string> {
      const transcription = await this.groq.audio.transcriptions.create({
        file: await toFile(audioBuffer, "speech.mp3"),
        language: "pl",
        model: "whisper-large-v3",
      });
      return transcription.text;
    }


     async describeImageWithContext(
    base64Image: string,
    context: string
  ): Promise<string> {
    const prompt = `Describe the image with the following context: ${context}`;
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${base64Image}` },
              },
            ],
          },
        ],
        max_tokens: 512,
      });
      return response.choices[0]?.message?.content || "[No text extracted]";
    } catch (err) {
      return `[ERROR: ${err instanceof Error ? err.message : err}]`;
    }
  }
  
}
