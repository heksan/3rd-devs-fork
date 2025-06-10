import fetch from "node-fetch";
import pdf from "pdf-parse/lib/pdf-parse.js";
import Tesseract from "tesseract.js";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import { PDFDocument } from "pdf-lib";
import { createCanvas } from "canvas";
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

// Patch the workerSrc for pdfjs-dist
const { GlobalWorkerOptions } = pdfjsLib;
GlobalWorkerOptions.workerSrc = require.resolve(
  "pdfjs-dist/legacy/build/pdf.worker.mjs"
);

const PERSONAL_API_KEY = "1290eb68-2031-404f-bfda-cf5dcd1a263d";

const PDF_URL = "https://c3ntrala.ag3nts.org/dane/notatnik-rafala.pdf";
const QUESTIONS_URL = `https://c3ntrala.ag3nts.org/data/${PERSONAL_API_KEY}/notes.json`;

export async function fetchPDFBuffer(): Promise<Buffer> {
  const res = await fetch(PDF_URL);
  if (!res.ok) throw new Error("Failed to fetch PDF");
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile("notebook_downloaded.pdf", buffer);
  return buffer;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer, { max: 18 }); // Extract all pages, will filter below
  // pdf-parse returns all text, but we want only pages 1-18
  // If needed, split by page markers or use another lib for per-page
  return data.text;
}

export async function extractPage19AsImage(
  buffer: Buffer,
  outPath: string
): Promise<void> {
  console.log("[extractPage19AsImage] Start extracting page 19 as image");
  // Extract page 19 as a separate PDF
  const pdfDoc = await PDFDocument.load(buffer);
  console.log("[extractPage19AsImage] Loaded PDF, copying page 19");
  const singlePagePdf = await PDFDocument.create();
  const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [18]); // page 19 (0-based)
  singlePagePdf.addPage(copiedPage);
  const singlePageBytes = await singlePagePdf.save();
  console.log("[extractPage19AsImage] Created single-page PDF for page 19");

  // Render the single-page PDF to PNG using canvas and pdfjs-dist
  const loadingTask = pdfjsLib.getDocument({ data: singlePageBytes });
  const pdf = await loadingTask.promise;
  console.log("[extractPage19AsImage] Loaded single-page PDF with pdfjs-dist");
  const page = await pdf.getPage(1);
  console.log("[extractPage19AsImage] Retrieved page 19 from PDF");
  const viewport = page.getViewport({ scale: 2.0 });
  // Use pdfjs-dist's canvasFactory for Node.js
  const canvasFactory = {
    create: (width: number, height: number) => {
      const canvas = createCanvas(width, height);
      const context = canvas.getContext("2d");
      return { canvas, context };
    },
    reset: (canvasAndContext: any, width: number, height: number) => {
      canvasAndContext.canvas.width = width;
      canvasAndContext.canvas.height = height;
    },
    destroy: (canvasAndContext: any) => {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };

  // Render the page using the custom canvasFactory
  const renderContext = {
    viewport,
    canvasFactory,
  };
  const renderResult = await page.render(renderContext).promise;
  const renderedCanvas = renderResult.canvas;
  console.log("[extractPage19AsImage] Rendered page 19 to canvas");
  const out = createWriteStream(outPath + ".png");
  await new Promise((resolve, reject) => {
    const stream = renderedCanvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => {
      console.log(`[extractPage19AsImage] Image saved to ${outPath}.png`);
      resolve(undefined);
    });
    out.on("error", (err) => {
      console.error("[extractPage19AsImage] Error saving image:", err);
      reject(err);
    });
  });
  console.log("[extractPage19AsImage] Extraction complete");
}

export async function ocrImage(imagePath: string): Promise<string> {
  const {
    data: { text },
  } = await Tesseract.recognize(imagePath, "pol");
  return text;
}

export async function fetchQuestionsJSON(): Promise<any> {
  const res = await fetch(QUESTIONS_URL);
  if (!res.ok) throw new Error("Failed to fetch questions JSON");
  return res.json();
}
