import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartText,
} from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(
    messages: ChatCompletionMessageParam[],
    model: string = "gpt-4o",
    stream: boolean = false,
    jsonMode: boolean = false
  ): Promise<
    | OpenAI.Chat.Completions.ChatCompletion
    | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  > {
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

  async describeImageWithContext(base64Image: string): Promise<string> {
    const prompt = `Decide whether the image is Ok, or needs one of the following actions: 
    -REPAIR 
    -DARKEN
    -BRIGHTEN

    RETURN ONLY the action name, without any additional text or OK if image needs no enhancement.
    `;
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
        max_tokens: 5512,
      });
      return response.choices[0]?.message?.content || "[No text extracted]";
    } catch (err) {
      return `[ERROR: ${err instanceof Error ? err.message : err}]`;
    }
  }

  async describeBarbara(base64Images: string[]): Promise<string[]> {
    const prompt = `Black haired woman on images should be desccribed as "Barbara" and should be described as detailed as possible.`;
    try {
      const contentArr: (
        | ChatCompletionContentPartText
        | ChatCompletionContentPartImage
      )[] = [
        { type: "text", text: prompt },
        ...base64Images.map((base64Image) => ({
          type: "image_url" as const,
          image_url: { url: `data:image/png;base64,${base64Image}` },
        })),
      ];
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: contentArr,
          },
        ],
        max_tokens: 3000,
      });
      const content =
        response.choices[0]?.message?.content || "[No text extracted]";
      return content
        .split(/\n{2,}|\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    } catch (err) {
      return base64Images.map(
        () => `[ERROR: ${err instanceof Error ? err.message : err}]`
      );
    }
  }

  async describeBarbara2(base64Images: string[]): Promise<string[]> {
    const prompt = `describe picture as detailed as possible, focus on the people on the picture`;
    const results: string[] = [];
    for (const base64Image of base64Images) {
      try {
        const contentArr: [
          ChatCompletionContentPartText,
          ChatCompletionContentPartImage,
        ] = [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64Image}` },
          },
        ];
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: contentArr as ChatCompletionContentPart[],
            },
          ],
          max_tokens: 10000,
        });
        const content =
          response.choices[0]?.message?.content || "[No text extracted]";
        results.push(content.trim());
      } catch (err) {
        results.push(`[ERROR: ${err instanceof Error ? err.message : err}]`);
      }
    }
    // Concatenate all descriptions and use completion to create one detailed description in Polish
    const joined = results.join("\n\n");
    const polishPrompt = `Na podstawie poniższych czterech opisów Barbary, stwórz jeden szczegółowy opis tej osoby w języku polskim.\n\n${joined}`;
    try {
      const messages: ChatCompletionMessageParam[] = [
        { role: "user", content: polishPrompt },
      ];
      const polishResponse = await this.completion(messages, "gpt-4o");
      const polishContent =
        (polishResponse as any).choices?.[0]?.message?.content ||
        "[No Polish description]";
      results.push(polishContent.trim());
    } catch (err) {
      results.push(`[ERROR (PL): ${err instanceof Error ? err.message : err}]`);
    }
    return results;
  }
}
