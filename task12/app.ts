import { OpenAIService } from "./OpenAIService";
import { TextSplitter } from "./TextService";
import { VectorService } from "./VectorService";
import fs from "fs";
import path from "path";

const query =
  "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";

const COLLECTION_NAME = "task12-2";

const openai = new OpenAIService();
const vectorService = new VectorService(openai);
const textSplitter = new TextSplitter();

function getData() {
  const dir = path.join(__dirname, "do-not-share");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
  return files.map((filename) => {
    const filePath = path.join(dir, filename);
    const text = fs.readFileSync(filePath, "utf-8");
    // Extract date from filename: YYYY_MM_DD.txt -> YYYY-MM-DD
    const dateOfDoc = filename.replace(".txt", "").replace(/_/g, "-");
    return { text, dateOfDoc };
  });
}

async function initializeData() {
  const data = getData();
  const points = await Promise.all(
    data.map(async ({ text, dateOfDoc }) => {
      const doc = await textSplitter.document(text, "gpt-4", { date: dateOfDoc });
      return doc;
    })
  );
  await vectorService.initializeCollectionWithData(COLLECTION_NAME, points);
}

async function main() {
  await initializeData();
  const searchResults = await vectorService.performSearch(
    COLLECTION_NAME,
    query,
    3
  );
  console.log(`Query: ${query}`);
  searchResults.forEach((result, resultIndex) => {
    const text = result.payload?.text || "";
    const metadata = result.payload?.metadata || {};
    console.log(`  ${resultIndex + 1}. ${JSON.stringify(result.payload)} (Score: ${result.score})`);
  });
  console.log();
}

main().catch(console.error);
