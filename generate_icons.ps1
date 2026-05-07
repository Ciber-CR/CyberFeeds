Add-Type -AssemblyName System.Drawing

function CreateIcon($path, $size, $isTray) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Purple RSS icon
    $accent = [System.Drawing.Color]::FromArgb(255, 189, 147, 249)
    $penWidth = if ($isTray) { $size * 0.15 } else { $size * 0.12 }
    $pen = New-Object System.Drawing.Pen $accent, $penWidth
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    # Adjust margins to maximize size
    $margin = $size * 0.1
    $cx = $margin
    $cy = $size - $margin
    $drawSize = $size - (2 * $margin)

    # Small arc
    $smallSize = $drawSize * 0.5
    $g.DrawArc($pen, [int]($cx - $smallSize), [int]($cy - $smallSize), [int]($smallSize * 2), [int]($smallSize * 2), 270, 90)
    
    # Large arc
    $g.DrawArc($pen, [int]($cx - $drawSize), [int]($cy - $drawSize), [int]($drawSize * 2), [int]($drawSize * 2), 270, 90)

    # Dot
    $brush = New-Object System.Drawing.SolidBrush $accent
    $dotSize = $size * 0.22
    $g.FillEllipse($brush, [int]($cx - $dotSize/4), [int]($cy - $dotSize*0.75), [int]$dotSize, [int]$dotSize)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $pen.Dispose()
    $brush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

# Generate main app icons
CreateIcon "c:\antigravity_projects\CybersFeeds\build\icon.png" 512 $false
CreateIcon "c:\antigravity_projects\CybersFeeds\resources\icon.png" 512 $false

# Generate tray icon
CreateIcon "c:\antigravity_projects\CybersFeeds\resources\tray.png" 32 $true
