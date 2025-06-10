import express from "express";
import { OpenAIService } from "./OpenAIService";
import { WebSearchService } from "./WebSearch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

async function downloadMediaFiles(links: string[], scrapeDir: string) {
  const fs = await import("fs/promises");
  const path = await import("path");
  const mp3Dir = path.join(scrapeDir, "mp3");
  const imgDir = path.join(scrapeDir, "img");
  await fs.mkdir(mp3Dir, { recursive: true });
  await fs.mkdir(imgDir, { recursive: true });
  const fetch = (await import("node-fetch")).default;
  for (const link of links) {
    if (typeof link === "string") {
      if (link.match(/\.mp3($|\?)/i)) {
        const res = await fetch(link);
        if (res.ok) {
          const fileName = link.split("/").pop()?.split("?")[0] || "file.mp3";
          const filePath = path.join(mp3Dir, fileName);
          const buffer = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(filePath, buffer);
          console.log(`Downloaded mp3: ${fileName}`);
        }
      } else if (link.match(/\.(png|jpg|jpeg|gif|bmp|webp)($|\?)/i)) {
        const res = await fetch(link);
        if (res.ok) {
          const fileName = link.split("/").pop()?.split("?")[0] || "image";
          const filePath = path.join(imgDir, fileName);
          const buffer = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(filePath, buffer);
          console.log(`Downloaded image: ${fileName}`);
        }
      }
    }
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const allowedDomains = [
      { name: "c3ntrala", url: "c3ntrala.ag3nts.org", scrappable: true },
    ];
    const webSearchService = new WebSearchService(allowedDomains);
    const scrapeResult = await webSearchService.scrapeUrl(
      "https://c3ntrala.ag3nts.org/dane/arxiv-draft.html"
    );
    console.log(
      "Scraping finished for https://c3ntrala.ag3nts.org/dane/arxiv-draft.html"
    );

    // Read scraperesult.md and extract links
    const fs = await import("fs/promises");
    const path = await import("path");
    const scrapeDir = path.resolve(__dirname, "scrape");
    const scraperesultPath = path.join(scrapeDir, "scraperesult.md");
    const scraperesultContent = await fs.readFile(scraperesultPath, "utf-8");
    // Extract links from markdown using regex
    const linkRegex = /\bhttps?:\/\/[^\s)]+/g;
    const links = scraperesultContent.match(linkRegex) || [];
    if (links.length > 0) {
      console.table(links.map((link: string) => ({ link })));
      await downloadMediaFiles(links, scrapeDir);
    } else {
      console.log("No links found in scraperesult.md");
    }
    // Extract image links and sentences after them from markdown
    const imageSentenceTable: { image: string; sentence: string }[] = [];
    const imageRegex =
      /!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|gif|bmp|webp)[^\s)]*)\)/gi;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    while ((match = imageRegex.exec(scraperesultContent)) !== null) {
      const imageUrl = match[1];
      // Get local image path in img folder
      const imageFileName = imageUrl.split("/").pop()?.split("?")[0] || "image";
      const localImagePath = path.join("scrape", "img", imageFileName);
      // Find the sentence after the image
      const afterImage = scraperesultContent.slice(imageRegex.lastIndex);
      // Find the first sentence (ends with . ! or ?)
      const sentenceMatch = afterImage.match(/[^.!?]*[.!?]/);
      const sentence = sentenceMatch ? sentenceMatch[0].trim() : "";
      imageSentenceTable.push({ image: localImagePath, sentence });
      lastIndex = imageRegex.lastIndex;
    }
    if (imageSentenceTable.length > 0) {
      console.table(imageSentenceTable);
    } else {
      console.log(
        "No images with following sentences found in scraperesult.md"
      );
    }
    // Describe each image using OpenAIService.describeImageWithContext
    const openaiService = new OpenAIService();
    const descriptions: {
      image: string;
      sentence: string;
      description: string;
    }[] = [];
    for (const row of imageSentenceTable) {
      // Read image as base64
      const imagePath = path.resolve(__dirname, row.image);
      try {
        const imageBuffer = await fs.readFile(imagePath);
        const base64Image = imageBuffer.toString("base64");
        const description = await openaiService.describeImageWithContext(
          base64Image,
          row.sentence
        );
        descriptions.push({
          image: row.image,
          sentence: row.sentence,
          description,
        });
        console.log(`Description for ${row.image}:`, description);
      } catch (err) {
        descriptions.push({
          image: row.image,
          sentence: row.sentence,
          description: `[ERROR: Could not read or describe image]`,
        });
        console.log(`Error processing ${row.image}`);
      }
    }
    // Optionally log the table of descriptions
    if (descriptions.length > 0) {
      console.table(descriptions);
    }
    // Transcribe all mp3 files in scrape/mp3 using OpenAIService.transcribeGroq
    const mp3DirPath = path.join(scrapeDir, "mp3");
    let mp3Files: string[] = [];
    try {
      mp3Files = (await fs.readdir(mp3DirPath)).filter((f) =>
        f.endsWith(".mp3")
      );
    } catch (e) {
      console.log("No mp3 directory or files found.");
    }
    const transcriptions: { file: string; transcription: string }[] = [];
    for (const mp3File of mp3Files) {
      try {
        const audioBuffer = await fs.readFile(path.join(mp3DirPath, mp3File));
        const transcription = await openaiService.transcribeGroq(audioBuffer);
        transcriptions.push({ file: mp3File, transcription });
        console.log(`Transcription for ${mp3File}:`, transcription);
      } catch (err) {
        transcriptions.push({
          file: mp3File,
          transcription: "[ERROR: Could not transcribe]",
        });
        console.log(`Error transcribing ${mp3File}`);
      }
    }
    if (transcriptions.length > 0) {
      console.table(transcriptions);
    }
    // Replace all image links in the markdown with their descriptions
    let updatedMd = scraperesultContent;
    for (const desc of descriptions) {
      // Find the original image markdown
      const imageFileName = desc.image.split(/[\\/]/).pop();
      const imageMdRegex = new RegExp(
        `!\\[[^\\]]*\\]\\([^)]*${imageFileName}[^)]*\\)`,
        "g"
      );
      updatedMd = updatedMd.replace(
        imageMdRegex,
        `[CONTEXT: ${desc.description}]`
      );
    }
    // Replace all mp3 links in the markdown with their transcriptions
    for (const t of transcriptions) {
      const mp3FileName = t.file;
      const mp3Regex = new RegExp(`https?://[^\s)]+${mp3FileName}[^\s)]*`, "g");
      updatedMd = updatedMd.replace(mp3Regex, `[CONTEXT: ${t.transcription}]`);
    }
    // Optionally log or save the updated markdown
    const updatedMdPath = path.join(scrapeDir, "scraperesult_with_context.md");
    await fs.writeFile(updatedMdPath, updatedMd, "utf-8");
    console.log("Updated markdown with context saved to", updatedMdPath);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to scrape URL" });
  }
});

app.post("/api/answer", async (req, res) => {
  const openaiService = new OpenAIService();

  const fs = await import("fs/promises");
  const path = await import("path");
  const scrapeDir = path.resolve(__dirname, "scrape");
  const scraperesultPath = path.join(scrapeDir, "scraperesult.md");
  const scraperesultContent = await fs.readFile(scraperesultPath, "utf-8");
  // Download list of questions from the provided URL
  const personalApiKey = process.env.PERSONAL_API_KEY;
  const questionsUrl = `https://c3ntrala.ag3nts.org/data/${personalApiKey}/arxiv.txt`;
  const fetch = (await import("node-fetch")).default;
  try {
    const questionsRes = await fetch(questionsUrl);
    if (questionsRes.ok) {
      const questionsText = await questionsRes.text();
      const questions = questionsText
        .split(/\r?\n/)
        .filter((line) => line.trim() && /=/.test(line))
        .map((line) => {
          const [id, ...qParts] = line.split("=");
          return { id: id.trim(), question: qParts.join("=").trim() };
        });
      console.table(questions);
      // Answer each question using the updated markdown with context
      const updatedMdPath = path.join(
        scrapeDir,
        "scraperesult_with_context.md"
      );
      const updatedMdContent = await fs.readFile(updatedMdPath, "utf-8");
      if (questions && questions.length > 0) {
        const answers: {
          id: string;
          question: string;
          thinking: string;
          answer: string;
        }[] = [];
        for (const q of questions) {
          const result = await answerQuestionWithContext(
            q.question,
            updatedMdContent,
            openaiService
          );
          answers.push({
            id: q.id,
            question: q.question,
            thinking: result.thinking,
            answer: result.answer,
          });
          console.log(
            `Q${q.id}: ${q.question}\n_thinking: ${result.thinking}\nAnswer: ${result.answer}\n`
          );
        }
        console.table(
          answers.map(({ id, question, answer }) => ({
            id,
            question,
            answer,
          }))
        );
        // Prepare answers object for report
        const answersObj: Record<string, string> = {};
        for (const a of answers) {
          answersObj[a.id] = a.answer;
        }
        // Send report
        console.log("Reporting answers:", {
          task: "arxiv",
          apikey: personalApiKey,
          answer: answersObj,
        });
        const reportRes = await fetch("https://c3ntrala.ag3nts.org/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "arxiv",
            apikey: personalApiKey,
            answer: answersObj,
          }),
        });
        const reportData = await reportRes.json();
        console.log("Report response:", reportData);
      }
    } else {
      console.log("Failed to download questions: ", questionsRes.status);
    }
  } catch (err) {
    console.log("Error downloading questions:", err);
  }
});

async function answerQuestionWithContext(
  question: string,
  contextMd: string,
  openaiService: OpenAIService
): Promise<{ answer: string; thinking: string }> {
  // Ensure messages are ChatCompletionMessageParam compliant

  const response = await openaiService.completionQ(
    contextMd,
    question,
    "gpt-4o"
  );
  let answer = "";
  let thinking = "";
  if (
    typeof response === "object" &&
    "choices" in response &&
    response.choices[0]?.message?.content
  ) {
    const content = response.choices[0].message.content;
    // Try to split _thinking and answer
    const match = content.match(/_thinking:(.*?)(?:\n|$)([\s\S]*)/i);
    if (match) {
      thinking = match[1].trim();
      answer = match[2].trim();
    } else {
      answer = content.trim();
    }
  }
  return { answer, thinking };
}


//for some reson this is not working every time, might just copy transcription in right place manually xd
// Standalone endpoint to add a new mp3 recording, transcribe it, and update context in markdown
app.post("/api/addRecording", async (req, res) => {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const openaiService = new OpenAIService();
    const scrapeDir = path.resolve(__dirname, "scrape");
    const mp3Dir = path.join(scrapeDir, "mp3");
    const updatedMdPath = path.join(scrapeDir, "scraperesult_with_context.md");
    // Find the first mp3 file in the mp3 folder
    let mp3Files: string[] = [];
    try {
      mp3Files = (await fs.readdir(mp3Dir)).filter((f) => f.endsWith(".mp3"));
    } catch {
      return res.status(404).json({ error: "No mp3 directory or files found" });
    }
    if (mp3Files.length === 0) {
      return res
        .status(404)
        .json({ error: "No mp3 files found in mp3 folder" });
    }
    const mp3FileName = mp3Files[0];
    const mp3Path = path.join(mp3Dir, mp3FileName);
    // Transcribe
    let transcription = "";
    try {
      const audioBuffer = await fs.readFile(mp3Path);
      transcription = await openaiService.transcribeGroq(audioBuffer);
    } catch (err) {
      return res.status(500).json({ error: "Transcription failed" });
    }
    // Replace all links to this mp3 in the context markdown with the transcription
    // Use a robust regex to match all forms of the mp3 link, including parenthesized, markdown, and bare links
    // This will match (https://.../rafal_dyktafon.mp3), [text](https://.../rafal_dyktafon.mp3), and bare links
    // Read the markdown file before replacing
    let updatedMd = await fs.readFile(updatedMdPath, "utf-8");
    const escapedFileName = mp3FileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match any link containing the mp3 file name, possibly surrounded by () or []()
    const mp3Regex = new RegExp(
      // Markdown: [text](url)
      `\\[.*?\\]\\((https?://[^\s)]+${escapedFileName}[^\s)]*)\\)` +
        // Parenthesized only: (url)
        `|\\((https?://[^\s)]+${escapedFileName}[^\s)]*)\\)` +
        // Bare link
        `|(https?://[^\s)]+${escapedFileName}[^\s)]*)`,
      "g"
    );
    updatedMd = updatedMd.replace(
      mp3Regex,
      `[CONTEXT - RAFAL BOMBA TALKING: ${transcription}]`
    );
    await fs.writeFile(updatedMdPath, updatedMd, "utf-8");
    console.log(
      `Updated markdown with context for ${mp3FileName} saved to ${updatedMdPath}`
    );
    res.status(200).json({ success: true, mp3FileName, transcription });
  } catch (err) {
    res.status(500).json({ error: "Failed to add recording" });
  }
});

app.listen(port, () => {
  console.log(`Task10 API listening at http://localhost:${port}`);
});
