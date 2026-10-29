$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;

public static class SpriteCleanerV1 {
  public static Bitmap KeepLargest(Bitmap source) {
    int width = source.Width, height = source.Height;
    bool[] visited = new bool[width * height];
    List<int> largest = new List<int>();
    int[] dx = { -1, 0, 1, -1, 1, -1, 0, 1 };
    int[] dy = { -1, -1, -1, 0, 0, 1, 1, 1 };
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        int start = y * width + x;
        if (visited[start] || source.GetPixel(x, y).A <= 10) continue;
        var component = new List<int>();
        var queue = new Queue<int>();
        visited[start] = true;
        queue.Enqueue(start);
        while (queue.Count > 0) {
          int current = queue.Dequeue();
          component.Add(current);
          int cx = current % width, cy = current / width;
          for (int direction = 0; direction < 8; direction++) {
            int nx = cx + dx[direction], ny = cy + dy[direction];
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            int next = ny * width + nx;
            if (visited[next] || source.GetPixel(nx, ny).A <= 10) continue;
            visited[next] = true;
            queue.Enqueue(next);
          }
        }
        if (component.Count > largest.Count) largest = component;
      }
    }
    var keep = new HashSet<int>(largest);
    var result = new Bitmap(source);
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        int index = y * width + x;
        if (result.GetPixel(x, y).A > 10 && !keep.Contains(index)) result.SetPixel(x, y, Color.Transparent);
      }
    }
    return result;
  }
}
'@ -ReferencedAssemblies System.Drawing

$referenceDirectory = Join-Path $PSScriptRoot '..\.memory\phases\2026-10-20-chicks-cannon-graphics-overhaul\P01-visual-rework\reference'
$source = Join-Path $referenceDirectory 'round-character-atlas-v1.png'
$source = [System.IO.Path]::GetFullPath($source)
$webAssets = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\apps\web\public\assets'))

$outputs = @(
  @{ Name = 'chicks\stage-1.png'; X = 0; Y = 0; W = 435; H = 455 },
  @{ Name = 'chicks\stage-2.png'; X = 435; Y = 0; W = 440; H = 455 },
  @{ Name = 'chicks\stage-3.png'; X = 875; Y = 0; W = 450; H = 455 },
  @{ Name = 'chicks\stage-4.png'; X = 1325; Y = 0; W = 449; H = 455 },
  @{ Name = 'cats\normal.png'; X = 0; Y = 380; W = 435; H = 507 },
  @{ Name = 'cats\shield.png'; X = 435; Y = 380; W = 440; H = 507 },
  @{ Name = 'cats\boss.png'; X = 875; Y = 370; W = 500; H = 517 },
  @{ Name = 'chicks\stage-1-blink.png'; X = 1375; Y = 390; W = 399; H = 497 }
)

$image = [System.Drawing.Bitmap]::FromFile($source)
try {
  foreach ($item in $outputs) {
    $rect = [System.Drawing.Rectangle]::new($item.X, $item.Y, $item.W, $item.H)
    $rawCrop = $image.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $crop = [SpriteCleanerV1]::KeepLargest($rawCrop)
    $rawCrop.Dispose()
    try {
      $minX = $crop.Width; $minY = $crop.Height; $maxX = -1; $maxY = -1
      for ($y = 0; $y -lt $crop.Height; $y++) {
        for ($x = 0; $x -lt $crop.Width; $x++) {
          if ($crop.GetPixel($x, $y).A -gt 10) {
            $minX = [Math]::Min($minX, $x); $maxX = [Math]::Max($maxX, $x)
            $minY = [Math]::Min($minY, $y); $maxY = [Math]::Max($maxY, $y)
          }
        }
      }
      if ($maxX -lt 0) { continue }
      $padding = 8
      $minX = [Math]::Max(0, $minX - $padding); $minY = [Math]::Max(0, $minY - $padding)
      $maxX = [Math]::Min($crop.Width - 1, $maxX + $padding); $maxY = [Math]::Min($crop.Height - 1, $maxY + $padding)
      $trimRect = [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
      $trimmed = $crop.Clone($trimRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      try {
        $target = Join-Path $webAssets $item.Name
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($target)) | Out-Null
        $trimmed.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
      } finally { $trimmed.Dispose() }
    } finally { $crop.Dispose() }
  }
} finally { $image.Dispose() }
