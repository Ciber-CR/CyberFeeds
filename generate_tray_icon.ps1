Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 16, 16
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), 2
# Center is at x=2, y=14
# Small arc (radius 6): bounding box is (-4, 8, 12, 12)
$g.DrawArc($pen, -4, 8, 12, 12, 270, 90)
# Large arc (radius 10): bounding box is (-8, 4, 20, 20)
$g.DrawArc($pen, -8, 4, 20, 20, 270, 90)

# Dot at center (2,14), size 3x3 => bounding box (0.5, 12.5, 3, 3)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillEllipse($brush, 0, 12, 4, 4)

$bmp.Save("c:\antigravity_projects\CybersFeeds\resources\tray.png", [System.Drawing.Imaging.ImageFormat]::Png)

$pen.Dispose()
$brush.Dispose()
$g.Dispose()
$bmp.Dispose()
