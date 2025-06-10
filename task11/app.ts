import express from "express";
import { OpenAIService } from "./OpenAIService";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const docsDir = path.join(__dirname, "./documents");
  const factsDir = path.join(__dirname, "./facts");
  try {
    const files = await fs.readdir(docsDir);
    const factsArrayPath = path.join(__dirname, "./factsArray.json");
    let factsArray: { index: number; fact: string }[] = [];
    // Check if factsArray.json exists
    let factsArrayExists = false;
    try {
      await fs.access(factsArrayPath);
      factsArrayExists = true;
    } catch (e) {
      factsArrayExists = false;
    }
    if (factsArrayExists) {
      // Load factsArray from file
      const factsArrayRaw = await fs.readFile(factsArrayPath, "utf8");
      factsArray = JSON.parse(factsArrayRaw);
      console.log("Loaded factsArray from file");
    } else {
      // Build factsArray from factsDir
      const factFiles = await fs.readdir(factsDir);
      let factIndex = 1;
      for (const factFile of factFiles) {
        const factPath = path.join(factsDir, factFile);
        const stat = await fs.stat(factPath);
        if (!stat.isFile()) continue;
        const factContent = await fs.readFile(factPath, "utf8");
        // Split facts by empty line
        const facts = factContent
          .split(/\r?\n\s*\r?\n/)
          .map((f) => f.trim())
          .filter(Boolean);
        for (const fact of facts) {
          factsArray.push({ index: factIndex, fact });
          factIndex++;
        }
      }
      // Save factsArray to a file
      await fs.writeFile(
        factsArrayPath,
        JSON.stringify(factsArray, null, 2),
        "utf8"
      );
      console.log("factsArray created and saved");
    }
    console.log("factsArray:", factsArray);
    // Save factsArray to a file
    const results = [];
    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      const content = await fs.readFile(filePath, "utf8");
      const prompt = `FILENAME: ${file}\nCONTENT:\n${content}`;
      const openaiService = new OpenAIService();
      const completion = await openaiService.completion(prompt);
      console.log(`Completion for file ${file}:`, completion);
      // Remove the old call that runs completionAssociation on the whole factsContext
      // Only run completionAssociation on chunks below
      // Remove old associatedFacts and factIndices logic
      // Prepare facts in 3 chunks
      const factsChunks = [
        factsArray.slice(0, 10),
        factsArray.slice(10, 20),
        factsArray.slice(20),
      ];
      let associationResults: any[] = [];
      for (const chunk of factsChunks) {
        const factsContext = chunk
          .map((f) => `${f.index}:${f.fact}`)
          .join("\n");
        // Log the range of indices of facts sent to completionAssociation
        const indices = chunk.map((f) => f.index);
        const minIdx = Math.min(...indices);
        const maxIdx = Math.max(...indices);
        console.log(
          `Sending fact indices to completionAssociation for file ${file}: [${minIdx}-${maxIdx}]`
        );
        const chunkAssociatedFacts = await openaiService.completionAssociation(
          completion,
          factsContext
        );
        console.log(
          `chunkAssociatedFacts for file ${file}`,
          chunkAssociatedFacts
        );
        // Try to parse as array, otherwise push as is
        try {
          const arr = JSON.parse(chunkAssociatedFacts);
          if (Array.isArray(arr)) {
            associationResults = associationResults.concat(arr);
          } else {
            associationResults.push(chunkAssociatedFacts);
          }
        } catch {
          associationResults.push(chunkAssociatedFacts);
        }
      }
      // associationResults is now assumed to always have unique indices
      // Collect all associated facts
      const allAssociatedFacts = associationResults
        .map((idx) => factsArray.find((f) => f.index === idx)?.fact)
        .filter(Boolean);
      const allAssociatedFactsIndices = associationResults
        .map((idx) => factsArray.find((f) => f.index === idx)?.index)
        .filter(Boolean);
      console.log(
        `allAssociatedFacts for file ${file}:`,
        allAssociatedFactsIndices
      );
      // Prepare report content: document content + all associated facts
      const reportContent = `CONTENT:\n${content}\n\nFACTS:\n${allAssociatedFacts.join("\n")}`;
      // Save report to file
      const assocDir = path.join(__dirname, "./fullContext");
      await fs.mkdir(assocDir, { recursive: true });
      const assocPath = path.join(assocDir, `${file}_associated_facts.txt`);
      await fs.writeFile(assocPath, reportContent, "utf8");
      results.push({
        file,
        completion,
        associatedFactIndices: associationResults,
      });

      const reportContent2 = `CONTENT:\n${completion}\n\nFACTS:\n${allAssociatedFacts.join("\n")}`;
      // Save report to file
      const assocDir2 = path.join(__dirname, "./fullContext2");
      await fs.mkdir(assocDir2, { recursive: true });
      const assocPath2 = path.join(assocDir2, `${file}_associated_facts.txt`);
      await fs.writeFile(assocPath2, reportContent2, "utf8");
    }
    res.status(200).json({ results });
  } catch (error) {
    console.error("/api/chat error:", error);
    res.status(500).json({ error: "Failed to analyze documents" });
  }
});

app.post("/api/chat3", async (req, res) => {
  // Instead of using req.body.prompt, cycle through each file in fullContext folder
  const fullContextDir = path.join(__dirname, "./fullContext");
  try {
    const files = await fs.readdir(fullContextDir);
    const openaiService = new OpenAIService();
    const answer: Record<string, string> = {};
    for (const file of files) {
      const filePath = path.join(fullContextDir, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      const content = await fs.readFile(filePath, "utf8");
      // Extract original document filename (before _associated_facts)
      const docFilename = file.replace(/_associated_facts.*$/, "");
      // Add filename to the prompt
      const promptWithFilename = `FILENAME: ${docFilename}\n${content}`;
      const keywords = await openaiService.findKeywords(promptWithFilename);
      console.log(`Keywords for ${docFilename}:`, keywords);
      answer[docFilename] = keywords;
    }
    const responseJson = {
      task: "dokumenty",
      apikey: process.env.PERSONAL_API_KEY,
      answer,
    };
    // Send JSON to external endpoint
    try {
      const fetch = (await import("node-fetch")).default;
      const extRes = await fetch("https://c3ntrala.ag3nts.org/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(responseJson),
      });
      const extText = await extRes.text();
      console.log("External endpoint response:", extText);
    } catch (err) {
      console.error("Failed to send to external endpoint:", err);
    }
    res.status(200).json(responseJson);
  } catch (error) {
    console.error("/api/chat3 error:", error);
    res.status(500).json({ error: "Failed to extract keywords" });
  }
});

app.listen(port, () => {
  console.log(`Task11 API listening at http://localhost:${port}`);
});
