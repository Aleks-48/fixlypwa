const fs = require('fs');
const path = require('path');

// Игнорируем служебные и билд-папки
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.idea',
  '.vscode',
  '.dart_tool',
  'ephemeral',
  'coverage',
  'windows',
  'linux',
  'macos',
  'android',
  'ios'
]);

// Собираем ТОЛЬКО файлы исходного кода
const ALLOWED_EXTS = new Set([
  '.dart',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.prisma',
  '.html',
  '.css',
  '.sql',
  '.yaml',
  '.yml'
]);

const OUTPUT_FILE = 'all_code_dump.txt';

function collectFiles(dirPath, fileList = []) {
  let items;
  try {
    items = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    return fileList;
  }

  for (const item of items) {
    // Пропускаем символические ссылки
    if (item.isSymbolicLink && item.isSymbolicLink()) continue;

    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      if (!IGNORE_DIRS.has(item.name)) {
        collectFiles(fullPath, fileList);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (item.name !== OUTPUT_FILE && item.name !== 'combine.js' && ALLOWED_EXTS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

function dumpCode() {
  const rootDir = process.cwd();
  console.log('Собираем только исходный код...');
  
  const files = collectFiles(rootDir);
  let outputStream = '';

  for (const filePath of files) {
    const relativePath = path.relative(rootDir, filePath);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      outputStream += `\n========================================\n`;
      outputStream += `FILE: ${relativePath}\n`;
      outputStream += `========================================\n\n`;
      outputStream += content + `\n\n`;
    } catch (err) {
      // Игнорируем ошибки чтения отдельных файлов
    }
  }

  fs.writeFileSync(path.join(rootDir, OUTPUT_FILE), outputStream, 'utf8');
  console.log(`Готово! Собрано файлов исходного кода: ${files.length}`);
  console.log(`Результат сохранён в: ${OUTPUT_FILE}`);
}

dumpCode();