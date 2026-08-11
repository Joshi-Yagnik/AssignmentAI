require('dotenv').config();
const { PDFParse } = require('pdf-parse');
const supabaseAdmin = require('./config/supabaseAdmin');

async function run() {
  const { data, error } = await supabaseAdmin.storage.from('submissions').download('1786448995386_23012021022_SEO_Assignment.pdf');
  if (error) {
    console.error('Download error:', error);
    return;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const parsed = await parser.getText();
    console.log('--- Extracted Text ---');
    console.log(parsed.text.trim());
    console.log('----------------------');
  } catch (err) {
    console.error('Parse Error:', err);
  } finally {
    await parser.destroy();
  }
}
run();
