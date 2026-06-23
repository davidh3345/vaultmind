"use client";

/** Extract text from an uploaded file IN THE BROWSER (plaintext never leaves it). */
export async function extractText(file: File): Promise<{ text: string; pages?: number }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  // txt / md / csv / json / anything text-ish
  return { text: await file.text() };
}

async function extractPdf(file: File): Promise<{ text: string; pages: number }> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const line = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out += `\n\n[[page ${p}]]\n${line}`;
  }
  return { text: out.trim(), pages: doc.numPages };
}
