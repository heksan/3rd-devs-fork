import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ANALYZE_SYSTEM_PROMPT } from "./preliminaryContext";
import { ASSOCIATION_SYSTEM_PROMPT } from "./associationContext";
import { KEYWORDS_SYSTEM_PROMPT } from "./prompts/keywordsSystemPrompt";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(prompt: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: ANALYZE_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 256,
      });
      console.log("OpenAI completion response:", JSON.stringify(response));
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async completionAssociation(
    documentAnalysis: string,
    factsContext: string
  ): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: ASSOCIATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: `KONTEKST:\n${documentAnalysis}\nFAKTY:\n${factsContext}\n.`,
      },
    ];
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 64,
      });
      console.log(
        "OpenAI completionAssociation response:",
        JSON.stringify(response)
      );
      return response.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
      console.error("Error in OpenAI completionAssociation:", error);
      throw error;
    }
  }

  async findKeywords(prompt: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: KEYWORDS_SYSTEM_PROMPT,
      },
      { role: "user", content: prompt },
    ];
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 200,
      });
      console.log("OpenAI findKeywords response:", JSON.stringify(response));
      return response.choices[0]?.message?.content?.trim() || "";
    } catch (error) {
      console.error("Error in OpenAI findKeywords:", error);
      throw error;
    }
  }
}
