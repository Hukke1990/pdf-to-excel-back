// server/pdfjs-extract.js
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js"; // import default
const { getDocument } = pdfjsLib; // extraer getDocument

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export async function extractTextFromPDF(buffer) {
  const uint8Array = new Uint8Array(buffer);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const localFontsPath = path.join(__dirname, "node_modules", "pdfjs-dist", "standard_fonts");
  let standardFontDataUrl;

  if (fs.existsSync(localFontsPath)) {
    standardFontDataUrl = "http://localhost:3001/pdfjs_fonts/";
    console.log("Usando standardFontDataUrl HTTP local:", standardFontDataUrl);
  } else {
    standardFontDataUrl = "https://unpkg.com/pdfjs-dist@latest/standard_fonts/";
    console.log("Usando standardFontDataUrl CDN:", standardFontDataUrl);
  }

  const loadingTask = getDocument({
    data: uint8Array,
    standardFontDataUrl,
  });

  const pdf = await loadingTask.promise;
  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items = content.items || [];
    const groups = new Map();

    items.forEach(i => {
      const ty = (i.transform && i.transform[5]) ?? i.y ?? 0;
      const tx = (i.transform && i.transform[4]) ?? i.x ?? 0;
      const yKey = Math.round(ty);
      if (!groups.has(yKey)) groups.set(yKey, []);
      groups.get(yKey).push({ x: tx, str: i.str });
    });

    const ys = Array.from(groups.keys()).sort((a, b) => b - a);
    for (const y of ys) {
      const row = groups.get(y)
        .sort((a, b) => a.x - b.x)
        .map(it => it.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (row) text += row + "\n";
    }
  }

  text = text.replace(/\\+n/g, "\n");
  text = text.replace(/\r\n/g, "\n");

  return text;
}
