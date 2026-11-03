const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'app', 'lib', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.dart'));

console.log('Scanning Flutter screens for untranslated strings...');

const results = [];
for (const file of files) {
  const content = fs.readFileSync(path.join(screensDir, file), 'utf-8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const match = line.match(/['"][^'"]*[а-яА-ЯёЁ]{3,}[^'"]*['"]/);
    if (match && !line.includes('appLanguage.value') && !line.includes('AppLocalizations.tr') && !line.includes('LegalDocsSheet')) {
      results.push({ file, line: idx + 1, snippet: match[0].substring(0, 60) });
    }
  });
}

console.log(`Found ${results.length} potential hardcoded Russian strings across ${files.length} files:`);
results.forEach(r => console.log(`${r.file}:${r.line} -> ${r.snippet}`));
