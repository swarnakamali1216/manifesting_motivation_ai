# fix_errors.ps1
# Run from: C:\manifesting-motivation-ai\frontend
# Command: powershell -ExecutionPolicy Bypass -File .\fix_errors.ps1

Write-Host "`n=== Fixing compile errors ===" -ForegroundColor Cyan

$src = ".\src"

# ── FIX 1: index.js — remove reportWebVitals (file was deleted) ──────────────
$indexPath = "$src\index.js"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw
    if ($content -match "reportWebVitals") {
        # Write clean index.js
        $clean = @"
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
        Set-Content $indexPath $clean -Encoding UTF8
        Write-Host "  Fixed index.js - removed reportWebVitals import" -ForegroundColor Green
    } else {
        Write-Host "  index.js already clean" -ForegroundColor Gray
    }
}

# ── FIX 2: Sidebar.jsx — remove NotificationSettings import ──────────────────
$sidebarPath = "$src\components\Sidebar.jsx"
if (Test-Path $sidebarPath) {
    $content = Get-Content $sidebarPath -Raw
    if ($content -match "NotificationSettings") {
        # Remove the import line
        $content = $content -replace "import NotificationSettings from ['\"].*NotificationSettings['\"];?\r?\n", ""
        # Remove any usage of NotificationSettings component
        $content = $content -replace "<NotificationSettings[^/]*/?>", ""
        $content = $content -replace "<NotificationSettings[^>]*>.*?</NotificationSettings>", ""
        Set-Content $sidebarPath $content -Encoding UTF8
        Write-Host "  Fixed Sidebar.jsx - removed NotificationSettings import" -ForegroundColor Green
    } else {
        Write-Host "  Sidebar.jsx already clean" -ForegroundColor Gray
    }
}

# ── FIX 3: Install missing npm packages ──────────────────────────────────────
Write-Host "`n  Installing missing packages..." -ForegroundColor Yellow
npm install react-router-dom lucide-react --save 2>&1 | Tail -3
Write-Host "  Packages installed" -ForegroundColor Green

Write-Host "`nAll fixes applied! Starting React..." -ForegroundColor Cyan
Write-Host "Run: npm start" -ForegroundColor Yellow