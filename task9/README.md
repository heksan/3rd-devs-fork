# Task9

Endpoint: POST /api/chat

Request body:

```
{
  "message": "..." // any string
}
```

Response:

- completion: OpenAI completion based on robot description
- robotDescription: description fetched from c3ntrala.ag3nts.org
- report: response from report endpoint

.env must contain:

- PERSONAL_API_KEY (for c3ntrala.ag3nts.org)
- OPENAI_API_KEY (for OpenAI)

---

This task is a clone of task8, but instead of image generation, it returns a text completion from OpenAI based on the robot description.
