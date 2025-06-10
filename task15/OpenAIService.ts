import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import fs from 'fs/promises';
import type { CreateEmbeddingResponse } from 'openai/resources/embeddings';

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(
    userText: string,
    model: string = "gpt-4o",
    stream: boolean = false,
    jsonMode: boolean = false
  ): Promise<
    | OpenAI.Chat.Completions.ChatCompletion
    | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  > {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
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


    async createEmbedding(text: string): Promise<number[]> {
      try {
        const response: CreateEmbeddingResponse = await this.openai.embeddings.create({
          model: "text-embedding-3-large",
          input: text,
        });
        return response.data[0].embedding;
      } catch (error) {
        console.error("Error creating embedding:", error);
        throw error;
      }
    }
}
