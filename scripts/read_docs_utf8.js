const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const docxDir = 'd:\\fixlypwa\\DOCS_FIXLY';
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

const outDir = path.join(__dirname, '..', 'docs', 'extracted_legal');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

files.forEach(f => {
  const fullPath = path.join(docxDir, f);
  try {
    const script = `
      [Console]::OutputEncoding = [System.Text.Encoding]::UTF8;
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $zip = [System.IO.Compression.ZipFile]::OpenRead('${fullPath}');
      $entry = $zip.GetEntry('word/document.xml');
      if ($entry) {
        $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8);
        $text = $reader.ReadToEnd();
        $clean = [System.Text.RegularExpressions.Regex]::Replace($text, '<[^>]+>', ' ');
        $clean = [System.Text.RegularExpressions.Regex]::Replace($clean, '\\s+', ' ');
        Write-Output $clean;
        $reader.Close();
      }
      $zip.Dispose();
    `;
    const out = execSync(`powershell -NoProfile -Command "${script.replace(/\r?\n/g, ' ')}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const txtName = f.replace('.docx', '.txt');
    fs.writeFileSync(path.join(outDir, txtName), out, 'utf-8');
    console.log(`Saved ${txtName} (${out.length} chars)`);
  } catch (err) {
    console.error(`Error reading ${f}:`, err.message);
  }
});
