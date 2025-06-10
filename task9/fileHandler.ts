import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import AdmZip from "adm-zip";

const ZIP_URL = "https://c3ntrala.ag3nts.org/dane/pliki_z_fabryki.zip";
const DOWNLOAD_DIR = path.join(__dirname, "downloads");
const ZIP_PATH = path.join(DOWNLOAD_DIR, "pliki_z_fabryki.zip");
const EXTRACT_DIR = path.join(DOWNLOAD_DIR, "extracted");

export async function downloadAndExtractZip() {
  console.log("[DOWNLOAD] Starting ZIP download...");
  // Ensure download directory exists
  if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    console.log(`[DOWNLOAD] Created directory: ${DOWNLOAD_DIR}`);
  }

  // Download the ZIP file
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error("Failed to download ZIP");
  const buffer = await res.buffer();
  fs.writeFileSync(ZIP_PATH, buffer);
  console.log(`[DOWNLOAD] ZIP file saved to: ${ZIP_PATH}`);

  // Extract ZIP
  const zip = new AdmZip(ZIP_PATH);
  zip.extractAllTo(EXTRACT_DIR, true);
  console.log(`[EXTRACT] ZIP extracted to: ${EXTRACT_DIR}`);
}

export function getFilteredFilesMap() {
  // Filter files: skip 'facts' folder, file without extension, and weapons_tests.zip
  const files = fs.readdirSync(EXTRACT_DIR).filter((file) => {
    const ext = path.extname(file);
    if (file === "weapons_tests.zip") return false;
    if (ext === "") return false;
    if (file === "facts" || file.startsWith("facts")) return false;
    return [".txt", ".png", ".mp3"].includes(ext);
  });

  // Return a map: { filename: absolutePath }
  return Object.fromEntries(
    files.map((file) => [file, path.join(EXTRACT_DIR, file)])
  );
}
