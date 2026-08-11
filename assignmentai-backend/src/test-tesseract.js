const fs = require('fs');
const { createWorker } = require('tesseract.js');

async function run() {
  const tesseract = await createWorker('eng');
  try {
    // We don't have a PDF handy, let's create a dummy one
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    console.log('Running OCR on invalid buffer...');
    const { data } = await tesseract.recognize(pdfBuffer);
    console.log('Result:', data.text);
  } catch (err) {
    console.error('OCR Error:', err.message);
  } finally {
    await tesseract.terminate();
  }
}
run();
