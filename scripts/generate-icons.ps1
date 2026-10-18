Add-Type -AssemblyName System.Drawing

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(18, 26, 35))
  $scale = $size / 512.0
  $graphics.ScaleTransform($scale, $scale)
  $coral = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(242, 81, 63))
  $cream = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 240, 210))
  $dark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(18, 26, 35))
  $wheelPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(247, 245, 240), 12)
  $graphics.FillRectangle($coral, 85, 260, 342, 83)
  $graphics.FillEllipse($coral, 85, 216, 342, 104)
  $roof = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(135, 264),
    [System.Drawing.Point]::new(163, 178),
    [System.Drawing.Point]::new(354, 178),
    [System.Drawing.Point]::new(385, 264)
  )
  $graphics.FillPolygon($coral, $roof)
  $window = [System.Drawing.Point[]]@(
    [System.Drawing.Point]::new(165, 243),
    [System.Drawing.Point]::new(180, 194),
    [System.Drawing.Point]::new(338, 194),
    [System.Drawing.Point]::new(359, 243)
  )
  $graphics.FillPolygon($cream, $window)
  $graphics.FillEllipse($dark, 112, 301, 88, 88)
  $graphics.FillEllipse($dark, 312, 301, 88, 88)
  $graphics.DrawEllipse($wheelPen, 130, 319, 52, 52)
  $graphics.DrawEllipse($wheelPen, 330, 319, 52, 52)
  $graphics.FillRectangle($cream, 102, 276, 55, 13)
  $graphics.FillRectangle($cream, 355, 276, 55, 13)
  $path = Join-Path $PSScriptRoot "..\public\icon-$size.png"
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $wheelPen.Dispose()
  $dark.Dispose()
  $cream.Dispose()
  $coral.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
