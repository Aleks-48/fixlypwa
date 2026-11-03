const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Скрипт распаковки docx и анализа текста
const docxDir = 'd:\\fixlypwa\\DOCS_FIXLY';
const files = fs.readdirSync(docxDir).filter(f => f.endsWith('.docx'));

console.log('Found documents:', files.length);

files.forEach(f => {
  const fullPath = path.join(docxDir, f);
  try {
    // Вытащим текст через tar/powershell или python/node
    const script = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $zip = [System.IO.Compression.ZipFile]::OpenRead('${fullPath}');
      $entry = $zip.GetEntry('word/document.xml');
      if ($entry) {
        $reader = New-Object System.IO.StreamReader($entry.Open());
        $text = $reader.ReadToEnd();
        $clean = [System.Text.RegularExpressions.Regex]::Replace($text, '<[^>]+>', ' ');
        $clean = [System.Text.RegularExpressions.Regex]::Replace($clean, '\\s+', ' ');
        Write-Output $clean;
        $reader.Close();
      }
      $zip.Dispose();
    `;
    const out = execSync(`powershell -NoProfile -Command "${script.replace(/\r?\n/g, ' ')}"`, { maxBuffer: 10 * 1024 * 1024 }).toString('utf-8');
    console.log(`\n========================================\nDOCUMENT: ${f}\n========================================`);
    console.log(out.substring(0, 1000));
    console.log('...\n[LENGTH]:', out.length, 'chars');
  } catch (err) {
    console.error(`Error reading ${f}:`, err.message);
  }
});
