# frontend_cleanup.ps1
# Run from your PROJECT ROOT (manifesting-motivation-ai folder):
#   cd manifesting-motivation-ai
#   .\frontend_cleanup.ps1
#
# What this deletes:
#   - pages/Onboarding.jsx      (wrong location — Onboarding belongs in components/)
#   - pages/pgadmin_tracking_queries.sql  (SQL junk file)
#   - components/WelcomeTour.jsx          (replaced by Onboarding.jsx)
#   - components/NotificationSettings.jsx (duplicate — notifications are in Settings.jsx)
#   - components/MilestoneAlert.jsx       (not imported anywhere)
#   - src/App.js                          (old duplicate of App.jsx)
#   - src/App.test.js                     (CRA boilerplate)
#   - src/reportWebVitals.js              (CRA boilerplate)
#   - src/setupTests.js                   (CRA boilerplate)
#   - src/logo.svg                        (default React logo, not used)
#
# What this KEEPS (everything important):
#   - App.jsx, App.css, index.css, index.js
#   - All pages: Dashboard, Goals, Journal, CheckIn, Settings, etc.
#   - All components: Sidebar, VoiceInput, ToastSystem, GoalCard, etc.

$frontend = ".\frontend\src"

$filesToDelete = @(
    # Wrong-location duplicate
    "$frontend\pages\Onboarding.jsx",

    # SQL junk file in wrong place
    "$frontend\pages\pgadmin_tracking_queries.sql",

    # Replaced components
    "$frontend\components\WelcomeTour.jsx",
    "$frontend\components\NotificationSettings.jsx",
    "$frontend\components\MilestoneAlert.jsx",

    # CRA boilerplate not needed
    "$frontend\App.js",
    "$frontend\App.test.js",
    "$frontend\reportWebVitals.js",
    "$frontend\setupTests.js",
    "$frontend\logo.svg"
)

Write-Host "`n=== Frontend Cleanup ===" -ForegroundColor Cyan
Write-Host "Files to delete:`n" -ForegroundColor Yellow

$found = @()
$notFound = @()

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        $found += $file
        Write-Host "  [FOUND]  $file" -ForegroundColor Red
    } else {
        $notFound += $file
        Write-Host "  [SKIP]   $file (not found)" -ForegroundColor Gray
    }
}

if ($found.Count -eq 0) {
    Write-Host "`nNothing to delete — already clean!" -ForegroundColor Green
    exit
}

Write-Host "`nWill delete $($found.Count) files." -ForegroundColor Yellow
$confirm = Read-Host "Type 'yes' to confirm deletion"

if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit
}

$deleted = 0
$errors = 0

foreach ($file in $found) {
    try {
        Remove-Item $file -Force
        Write-Host "  Deleted: $file" -ForegroundColor Green
        $deleted++
    } catch {
        Write-Host "  ERROR deleting $file : $_" -ForegroundColor Red
        $errors++
    }
}

Write-Host "`nDone: $deleted deleted, $errors errors" -ForegroundColor Cyan

# Also show what NEW files need to be added
Write-Host "`n=== Files you still need to add ===" -ForegroundColor Cyan
Write-Host "  frontend\src\pages\LandingPage.jsx       <- from downloads (NEW)" -ForegroundColor Yellow
Write-Host "  frontend\src\components\Onboarding.jsx   <- from downloads (NEW)" -ForegroundColor Yellow
Write-Host "  frontend\.env                            <- create with: REACT_APP_API_URL=http://localhost:5000/api" -ForegroundColor Yellow

Write-Host "`nDone! Restart React: npm start" -ForegroundColor Green