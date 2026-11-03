const fs = require('fs');
const path = require('path');

// 1. Web dictionaries.ts analysis
const dictPath = path.join(__dirname, '..', 'web', 'src', 'lib', 'i18n', 'dictionaries.ts');
const dictContent = fs.readFileSync(dictPath, 'utf-8');

function parseDict(lang) {
  const result = {};
  // match language block
  const startIdx = dictContent.indexOf(`${lang}: {`);
  if (startIdx === -1) return result;
  
  // find matching closing brace or next lang
  let depth = 0;
  let block = '';
  for (let i = startIdx + `${lang}:`.length; i < dictContent.length; i++) {
    if (dictContent[i] === '{') depth++;
    else if (dictContent[i] === '}') {
      depth--;
      if (depth === 0) {
        block = dictContent.substring(startIdx, i + 1);
        break;
      }
    }
  }

  const lines = block.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || !trimmed.includes(':')) continue;
    const colonIdx = trimmed.indexOf(':');
    const key = trimmed.substring(0, colonIdx).trim();
    let val = trimmed.substring(colonIdx + 1).trim();
    if (val.endsWith(',')) val = val.slice(0, -1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && val) {
      result[key] = val;
    }
  }
  return result;
}

const ruWeb = parseDict('ru');
const kkWeb = parseDict('kk');
const enWeb = parseDict('en');

console.log('=== WEB I18N AUDIT ===');
console.log('RU total keys:', Object.keys(ruWeb).length);
console.log('KK total keys:', Object.keys(kkWeb).length);
console.log('EN total keys:', Object.keys(enWeb).length);

const missingInKK = Object.keys(ruWeb).filter(k => !kkWeb[k]);
const missingInEN = Object.keys(ruWeb).filter(k => !enWeb[k]);

console.log('\nMissing in KK (Web):', missingInKK.length, missingInKK);
console.log('Missing in EN (Web):', missingInEN.length, missingInEN);

// Untranslated keys (where text is still in Russian)
const untranslatedKK = Object.keys(ruWeb).filter(k => {
  const val = kkWeb[k];
  if (!val) return false;
  // If it contains Cyrillic letters that look identical to Russian and no Kazakh specific letters
  return val === ruWeb[k] && val.length > 3 && /[а-яА-ЯёЁ]/.test(val);
});

const untranslatedEN = Object.keys(ruWeb).filter(k => {
  const val = enWeb[k];
  if (!val) return false;
  // If EN text has cyrillic letters
  return /[а-яА-ЯёЁ]/.test(val);
});

console.log('\nUntranslated in KK (identically equal to Russian):', untranslatedKK.length, untranslatedKK);
console.log('Untranslated in EN (contains Cyrillic):', untranslatedEN.length, untranslatedEN);


// 2. Flutter app_localizations.dart analysis
const flutterPath = path.join(__dirname, '..', 'app', 'lib', 'core', 'app_localizations.dart');
const flutterContent = fs.readFileSync(flutterPath, 'utf-8');

function parseFlutter(lang) {
  const result = {};
  const startIdx = flutterContent.indexOf(`'${lang}': {`);
  if (startIdx === -1) return result;

  let depth = 0;
  let block = '';
  for (let i = startIdx + `'${lang}':`.length; i < flutterContent.length; i++) {
    if (flutterContent[i] === '{') depth++;
    else if (flutterContent[i] === '}') {
      depth--;
      if (depth === 0) {
        block = flutterContent.substring(startIdx, i + 1);
        break;
      }
    }
  }

  const lines = block.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || !trimmed.includes(':')) continue;
    const colonIdx = trimmed.indexOf(':');
    let key = trimmed.substring(0, colonIdx).trim();
    if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
      key = key.slice(1, -1);
    }
    let val = trimmed.substring(colonIdx + 1).trim();
    if (val.endsWith(',')) val = val.slice(0, -1);
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (key && val) {
      result[key] = val;
    }
  }
  return result;
}

const ruFlutter = parseFlutter('ru');
const kkFlutter = parseFlutter('kk');
const enFlutter = parseFlutter('en');

console.log('\n=== FLUTTER APP LOCALIZATIONS AUDIT ===');
console.log('RU total keys:', Object.keys(ruFlutter).length);
console.log('KK total keys:', Object.keys(kkFlutter).length);
console.log('EN total keys:', Object.keys(enFlutter).length);

const missingInKKFlutter = Object.keys(ruFlutter).filter(k => !kkFlutter[k]);
const missingInENFlutter = Object.keys(ruFlutter).filter(k => !enFlutter[k]);

console.log('\nMissing in KK (Flutter):', missingInKKFlutter.length, missingInKKFlutter);
console.log('Missing in EN (Flutter):', missingInENFlutter.length, missingInENFlutter);

const untranslatedENFlutter = Object.keys(ruFlutter).filter(k => {
  const val = enFlutter[k];
  if (!val) return false;
  return /[а-яА-ЯёЁ]/.test(val);
});

console.log('Untranslated in EN Flutter (contains Cyrillic):', untranslatedENFlutter.length, untranslatedENFlutter);
