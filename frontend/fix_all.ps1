# fix_all.ps1
# Place in: C:\manifesting-motivation-ai\frontend\
# Run with: powershell -ExecutionPolicy Bypass -File .\fix_all.ps1

$src = ".\src"

Write-Host "`n=== Step 1: Fix Sidebar.jsx (remove NotificationSettings) ===" -ForegroundColor Cyan
$sidebarPath = "$src\components\Sidebar.jsx"
if (Test-Path $sidebarPath) {
    $lines = Get-Content $sidebarPath
    $fixed = $lines | Where-Object { $_ -notmatch "NotificationSettings" }
    $fixed | Set-Content $sidebarPath -Encoding UTF8
    Write-Host "  Sidebar.jsx fixed" -ForegroundColor Green
}

Write-Host "`n=== Step 2: Fix index.js (remove reportWebVitals) ===" -ForegroundColor Cyan
$indexPath = "$src\index.js"
$newIndex = @"
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
"@
Set-Content $indexPath $newIndex -Encoding UTF8
Write-Host "  index.js fixed" -ForegroundColor Green

Write-Host "`n=== Step 3: Delete duplicate and junk files ===" -ForegroundColor Cyan
$toDelete = @(
    "$src\pages\Landing.jsx",
    "$src\pages\Auth.jsx",
    "$src\pages\AITools.jsx",
    "$src\pages\Analytics.jsx",
    "$src\pages\InviteSection.jsx",
    "$src\pages\March_Review_Viva_Prep.docx",
    "$src\pages\client_secret_306325664410-tm9u3.json",
    "$src\pages\client_secret_306325664410-tm9u3..."
)

$toDelete += (Get-ChildItem "$src\pages\" -Filter "client_secret*" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)

foreach ($f in $toDelete) {
    if ($f -and (Test-Path $f)) {
        Remove-Item $f -Force
        Write-Host "  Deleted: $(Split-Path $f -Leaf)" -ForegroundColor Green
    }
}

Write-Host "`n=== Step 4: Fix node_modules (reinstall) ===" -ForegroundColor Cyan
Write-Host "  Removing node_modules..." -ForegroundColor Yellow
if (Test-Path ".\node_modules") {
    Remove-Item ".\node_modules" -Recurse -Force
    Write-Host "  node_modules removed" -ForegroundColor Green
}
if (Test-Path ".\package-lock.json") {
    Remove-Item ".\package-lock.json" -Force
    Write-Host "  package-lock.json removed" -ForegroundColor Green
}
Write-Host "  Installing packages (this takes 2-3 minutes)..." -ForegroundColor Yellow
npm install
Write-Host "  Packages installed" -ForegroundColor Green

Write-Host "`nAll done! Run: npm start" -ForegroundColor Cyan