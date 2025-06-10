import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(
    messages: ChatCompletionMessageParam[],
    model: string = "gpt-4o"
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
      });
      return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }


  async completionsingle(
    message: string,
    model: string = "gpt-4o"
  ): Promise<string> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content:  `Based on the following text, and following map with 16 segments, marked as (x,y): x is vertical, y is horizontal, and starting in top left corner (1.Marker), decide where did the drone go. Write answer in Polish! respond with 1 word only ${message}
Map segments are as follows:
    1. Marker (0,0)
2. Grass (0,1)
3. Tree (0,2)
4. House (0,3)
5. Grass (1,0)
6. Windmill (1,1)
7. Grass (1,2)
8. Grass (1,3)
9. Grass (2,0)
12. Grass (2,1)
10. Rocks (2,2)
11. Trees (2,3)
13. Mountains (3,0)
14. Mountains (3,1)
15. Car (3,2)
16. Cave (3,3)
    decide where did the drone go. Write answer in Polish! respond with 1 word only right after _thinking where you will explain your reasoning ${message}` }],
        model,
      });
      return chatCompletion.choices[0]?.message?.content ?? "";
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }


  async describeMap(base64Image: string, context: string): Promise<string> {
    const prompt = `Map is divided into 16 segments by 4 by 4, describe each segment with 1 word `;
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



  async describeSegment(base64Image: string, context: string): Promise<string> {
    const prompt = `Based on the following text, and starting in top left corner (with a gps sign), remember that bottom right corner is a cave describe a segment to which drone has travelled with 1 word only. Write answer in Polish! ${context}`;
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
