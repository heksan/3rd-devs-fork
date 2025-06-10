import express from "express";
import { OpenAIService } from "./OpenAIService";
import { log } from "console";
import fs from "fs";

const app = express();
const port = 3000;
app.use(express.json());

const openaiService = new OpenAIService();

// Read and encode the image only once at startup
const base64Image = fs
  .readFileSync(__dirname + "/segments.PNG")
  .toString("base64");

app.post("/api/chat", async (req, res) => {
  const message = req.body.instruction;
  log("Received request with message:", message);

  try {
    const completion = await openaiService.completionsingle(
       message ,
      "gpt-4o"
    );
    
 log("Completion:", completion);
    res.json({ description: completion });  } catch (error) {
    res.status(500).json({ error: "Failed to get completion" });
  }
});

app.post("/api/chat2", async (req, res) => {
  const message = req.body.instruction;
  log("Received request with message:", message);

  try {
    const completion = await openaiService.describeSegment(
      base64Image,
      message
    );
    log("Completion:", completion);
    res.json({ description: completion });
  } catch (error) {
    res.status(500).json({ error: "Failed to get completion" });
  }
});


app.post("/api/chat3", async (req, res) => {
  const message = req.body.instruction;
  log("Received request with message:", message);

  try {
    const completion = await openaiService.describeMap(
      base64Image,
      message
    );
    log("Completion:", completion);
    res.json({ description: completion });
  } catch (error) {
    res.status(500).json({ error: "Failed to get completion" });
  }
});

app.listen(port, () => {
  console.log(
    `Server running at http://localhost:${port}. Listening for POST /api/chat requests`
  );
});
