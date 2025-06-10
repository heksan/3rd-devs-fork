# Task 8

This is a simple Express API with a single POST endpoint `/api/chat` that uses OpenAI's chat completion. Send a JSON body with a `message` field to get a response from the assistant.

## Usage

1. Start the server:
   ```sh
   bun run task8/app.ts
   ```
2. Send a POST request:
   ```sh
   curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message": "Hello!"}'
   ```

## Files

- `app.ts`: Express server with `/api/chat` endpoint
- `OpenAIService.ts`: Service for OpenAI chat completions
