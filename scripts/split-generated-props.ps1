$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = Join-Path $PSScriptRoot '..\.memory\phases\2026-10-20-chicks-cannon-graphics-overhaul\P01-visual-rework\reference\gameplay-props-3d-atlas-v2.png'
$source = [System.IO.Path]::GetFullPath($source)
$outputDirectory = Join-Path $PSScriptRoot '..\apps\web\public\assets\props'
$outputDirectory = [System.IO.Path]::GetFullPath($outputDirectory)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$names = @(
  'nest', 'slingshot', 'egg', 'wood',
  'stone', 'glass', 'tnt', 'tire',
  'gear', 'fan', 'shutter', 'chandelier'
)

$image = [System.Drawing.Bitmap]::FromFile($source)
try {
  $xBounds = @(0, [Math]::Round($image.Width / 4), [Math]::Round($image.Width / 2), [Math]::Round($image.Width * 3 / 4), $image.Width)
  $yBounds = @(0, [Math]::Round($image.Height / 3), [Math]::Round($image.Height * 2 / 3), $image.Height)

  for ($row = 0; $row -lt 3; $row++) {
    for ($column = 0; $column -lt 4; $column++) {
      $index = $row * 4 + $column
      $cell = [System.Drawing.Rectangle]::new(
        [int]$xBounds[$column],
        [int]$yBounds[$row],
        [int]($xBounds[$column + 1] - $xBounds[$column]),
        [int]($yBounds[$row + 1] - $yBounds[$row])
      )
      $crop = $image.Clone($cell, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $minX = $crop.Width
        $minY = $crop.Height
        $maxX = -1
        $maxY = -1
        for ($y = 0; $y -lt $crop.Height; $y++) {
          for ($x = 0; $x -lt $crop.Width; $x++) {
            if ($crop.GetPixel($x, $y).A -gt 8) {
              if ($x -lt $minX) { $minX = $x }
              if ($x -gt $maxX) { $maxX = $x }
              if ($y -lt $minY) { $minY = $y }
              if ($y -gt $maxY) { $maxY = $y }
            }
          }
        }
        if ($maxX -lt 0) { continue }
        $padding = 8
        $minX = [Math]::Max(0, $minX - $padding)
        $minY = [Math]::Max(0, $minY - $padding)
        $maxX = [Math]::Min($crop.Width - 1, $maxX + $padding)
        $maxY = [Math]::Min($crop.Height - 1, $maxY + $padding)
        $trimRect = [System.Drawing.Rectangle]::new([int]$minX, [int]$minY, [int]($maxX - $minX + 1), [int]($maxY - $minY + 1))
        $trimmed = $crop.Clone($trimRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
          if ($names[$index] -eq 'slingshot') {
            for ($clearX = 0; $clearX -lt [Math]::Min(28, $trimmed.Width); $clearX++) {
              for ($clearY = 0; $clearY -lt $trimmed.Height; $clearY++) {
                $trimmed.SetPixel($clearX, $clearY, [System.Drawing.Color]::Transparent)
              }
            }
          }
          $target = Join-Path $outputDirectory ($names[$index] + '.png')
          $trimmed.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
          $trimmed.Dispose()
        }
      } finally {
        $crop.Dispose()
      }
    }
  }
} finally {
  $image.Dispose()
}
