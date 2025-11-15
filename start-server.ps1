# PowerShell HTTP Server for Task Manager
# This script creates a simple HTTP server using PowerShell (no external dependencies required)

$port = 8000
$url = "http://localhost:$port/"

Write-Host "Starting Task Manager Server with PowerShell..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will be available at: $url" -ForegroundColor Cyan
Write-Host "Keep this window open while using the app." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

# Get the directory where this script is located
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)

try {
    $listener.Start()
    Write-Host "Server started successfully!" -ForegroundColor Green
    Write-Host "Open your browser to: $url" -ForegroundColor Cyan
    Write-Host ""
    
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        
        # Default to index.html if root path
        if ($localPath -eq "/") {
            $localPath = "/index.html"
        }
        
        # Remove leading slash and get full file path
        $filePath = Join-Path $scriptPath $localPath.TrimStart('/')
        
        # Security: Ensure file is within the script directory
        $filePath = [System.IO.Path]::GetFullPath($filePath)
        $scriptPathFull = [System.IO.Path]::GetFullPath($scriptPath)
        
        if (-not $filePath.StartsWith($scriptPathFull, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }
        
        # Check if file exists
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            
            # Set content type based on file extension
            $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($extension) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".jpeg" { "image/jpeg" }
                ".gif"  { "image/gif" }
                ".svg"  { "image/svg+xml" }
                ".ico"  { "image/x-icon" }
                default { "application/octet-stream" }
            }
            
            $response.ContentType = $contentType
            $response.OutputStream.Write($content, 0, $content.Length)
            $response.StatusCode = 200
        } else {
            # File not found
            $response.StatusCode = 404
            $notFoundHtml = @"
<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
</head>
<body>
    <h1>404 - File Not Found</h1>
    <p>The requested file was not found on this server.</p>
</body>
</html>
"@
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes($notFoundHtml)
            $response.ContentLength64 = $notFoundBytes.Length
            $response.ContentType = "text/html; charset=utf-8"
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    Write-Host ""
    Write-Host "Server stopped." -ForegroundColor Yellow
}

