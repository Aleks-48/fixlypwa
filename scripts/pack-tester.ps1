param([string]$OutputName = 'Fixly-test-2026-09-24.zip')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([IO.Path]::GetFileName($OutputName) -ne $OutputName -or -not $OutputName.EndsWith('.zip')) { throw 'OutputName must be a ZIP filename' }
$outputDirectory = Join-Path $taskRoot 'artifacts'
New-Item -ItemType Directory -Force $outputDirectory | Out-Null
$outputPath = Join-Path $outputDirectory $OutputName
if (Test-Path -LiteralPath $outputPath) { throw 'Archive already exists; choose a new OutputName.' }
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$excludedDirs = @('node_modules','.next','.next-buildcheck','storage','.git','.dart_tool','build','.gradle','.idea','.vscode','ephemeral','.symlinks','uploads','coverage','test-results','playwright-report','blob-report','generated','.local-backups','pwa','spikes','supabase')
$excludedNames = @('local.properties','key.properties','google-services.json','GoogleService-Info.plist','firebase_options.dart','.flutter-plugins','.flutter-plugins-dependencies','full_project_context.md','query','ngrok.yml','ngrok.exe')
function Add-SafeFiles([string]$directory) {
  foreach ($item in Get-ChildItem -LiteralPath $directory -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
    if ($item.PSIsContainer) {
      if ($item.Name -notin $excludedDirs) { Add-SafeFiles $item.FullName }
      continue
    }
    if ($item.Name -in $excludedNames) { continue }
    if ($item.Name -like 'technical-*.json') { continue }
    if ($item.Name.StartsWith('.env') -and $item.Name -ne '.env.example') { continue }
    if ($item.Name -match '^(sw|workbox-.+|worker-.+|fallback-.+)\.js(\.map)?$') { continue }
    if ($item.Extension -match '^\.(log|dump|bak|jks|keystore|pem|key|p12|pfx|tsbuildinfo|zip|rar|apk|aab)$') { continue }
    $files.Add($item)
  }
}
foreach ($name in @('web','app')) { Add-SafeFiles (Join-Path $taskRoot $name) }
foreach ($name in @('docs/specs','docs/requirements','docs/adr')) { Add-SafeFiles (Join-Path $taskRoot $name) }
foreach ($name in @('.gitignore','README.md','README_FOR_TESTER.md','TESTING.md','START_TESTER.bat','AGENTS.md','docs/tester-handoff-status.md','docs/technical-status-2026-09-24.md','docs/technical-acceptance-2026-09-26.md','scripts/pack-tester.ps1')) {
  $files.Add((Get-Item -LiteralPath (Join-Path $taskRoot $name)))
}

# Compare text against long secret values from the real local environment, without printing values.
$secretValues = @()
$publicTemplate = [IO.File]::ReadAllText((Join-Path $taskRoot 'web/.env.example'))
$localEnv = Join-Path $taskRoot 'web/.env'
if (Test-Path -LiteralPath $localEnv) {
  foreach ($line in Get-Content -LiteralPath $localEnv) {
    if ($line -match '^([A-Z0-9_]*(?:PASSWORD|TOKEN|SECRET|PRIVATE_KEY|API_KEY|DIRECT_URL|DATABASE_URL))=(.+)$') {
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      if ($value.Length -ge 12 -and -not $publicTemplate.Contains($value)) { $secretValues += $value }
    }
  }
}
foreach ($file in $files) {
  if ($file.Length -gt 5000000) { continue }
  if ($file.Extension -in @('.png','.jpg','.jpeg','.webp','.ico','.ttf','.woff','.woff2','.jar','.pdf')) { continue }
  $content = [IO.File]::ReadAllText($file.FullName)
  foreach ($secret in $secretValues) {
    if ($content.Contains($secret)) { throw "Local secret value found in $($file.FullName)" }
  }
  if ($content -match '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----') { throw "Private key in $($file.FullName)" }
}
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open($outputPath, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in ($files | Sort-Object FullName -Unique)) {
    $relative = $file.FullName.Substring($taskRoot.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, "Fixly/$relative", [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
  $stub = $zip.CreateEntry('Fixly/app/lib/firebase_options.dart')
  $writer = [IO.StreamWriter]::new($stub.Open())
  try { $writer.Write("import 'package:firebase_core/firebase_core.dart';`nclass DefaultFirebaseOptions {`n  static FirebaseOptions get currentPlatform => throw UnsupportedError('Push is disabled in this test archive. Configure your own Firebase project to enable it.');`n}`n") } finally { $writer.Dispose() }
} finally { $zip.Dispose() }
$check = [IO.Compression.ZipFile]::OpenRead($outputPath)
try {
  $names = @($check.Entries | ForEach-Object FullName)
  if ($names | Where-Object { $_ -match '/(node_modules|\.git|\.next|uploads|\.dart_tool)/|/\.env$|\.dump$' }) { throw 'Forbidden archive entry' }
  foreach ($required in @('Fixly/TESTING.md','Fixly/web/.env.example','Fixly/web/package-lock.json','Fixly/web/scripts/setup-tester.mjs','Fixly/app/.env.example','Fixly/web/tests/integration/technical-stabilization.integration.test.ts')) {
    if ($required -notin $names) { throw "Missing $required" }
  }
  $names | Set-Content -LiteralPath ($outputPath + '.manifest.txt') -Encoding utf8
  Write-Output "Verified $($names.Count) entries"
} finally { $check.Dispose() }
$hash = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash
"$hash  $OutputName" | Set-Content -LiteralPath ($outputPath + '.sha256.txt') -Encoding ascii
Get-Item -LiteralPath $outputPath | Select-Object FullName,Length
