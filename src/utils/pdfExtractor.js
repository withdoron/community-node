/**
 * PDF text extraction using pdf.js loaded from CDN.
 * Copied from financial-node's Upload.jsx — proven approach for Base44/Vite projects.
 */

const PDF_JS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDF_JS_CDN;
    script.async = true;
    script.onload = () => resolve(window.pdfjsLib);
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });
}

export async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await loadPdfJs();

  // Set worker source — CDN approach for Base44/Vite (worker needed for some PDFs)
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const ver = pdfjsLib.version || "3.11.174";
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${ver}/pdf.worker.min.js`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = (content.items || []).map((item) => (item && item.str) ? item.str : "").filter(Boolean);
    pages.push(strings.join(" "));
  }
  return pages.join("\n");
}
