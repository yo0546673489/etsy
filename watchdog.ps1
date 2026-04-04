# Watchdog — מוודא ש-etsy-messages תמיד רץ
# מופעל כל דקה ע"י Task Scheduler

$PM2 = "C:\Users\Administrator\AppData\Roaming\npm\pm2.cmd"
$env:PM2_HOME = "C:\Users\Administrator\.pm2"
$env:PATH = $env:PATH + ";C:\Users\Administrator\AppData\Roaming\npm;C:\Program Files\nodejs"
$LogFile = "C:\etsy\watchdog.log"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp $msg" | Add-Content $LogFile
}

try {
    # בדוק אם etsy-messages רץ
    $status = & $PM2 jlist 2>$null | ConvertFrom-Json 2>$null
    $process = $status | Where-Object { $_.name -eq "etsy-messages" -and $_.pm2_env.status -eq "online" }

    if ($process) {
        # רץ — אין צורך בפעולה
        exit 0
    } else {
        Log "etsy-messages not running — starting..."

        # נסה resurrect קודם (אם daemon חי)
        $resurrect = & $PM2 resurrect 2>&1
        Start-Sleep -Seconds 3

        # בדוק שוב
        $status2 = & $PM2 jlist 2>$null | ConvertFrom-Json 2>$null
        $process2 = $status2 | Where-Object { $_.name -eq "etsy-messages" -and $_.pm2_env.status -eq "online" }

        if (-not $process2) {
            # resurrect לא עבד — start מאפס
            Log "Resurrect failed — starting fresh"
            Set-Location "C:\etsy"
            $distDir = (Get-ChildItem "C:\etsy" -Directory | Where-Object { Test-Path (Join-Path $_.FullName "dist\index.js") })[0].FullName
            & $PM2 start (Join-Path $distDir "dist\index.js") --name etsy-messages 2>&1 | Out-Null
            & $PM2 save 2>&1 | Out-Null
            Log "Started etsy-messages fresh"
        } else {
            Log "Resurrected successfully"
        }
    }
} catch {
    Log "Watchdog error: $_"
    # ניסיון אחרון — start ישיר
    try {
        $distDir = (Get-ChildItem "C:\etsy" -Directory | Where-Object { Test-Path (Join-Path $_.FullName "dist\index.js") })[0].FullName
        & $PM2 start (Join-Path $distDir "dist\index.js") --name etsy-messages 2>&1 | Out-Null
        Log "Emergency start completed"
    } catch {
        Log "Emergency start failed: $_"
    }
}
