# Renders the AfterRing pitch frames with GDI+ (System.Drawing), one PNG per frame.
#   powershell -File render-frames.ps1 -Timeline build\timeline.json -OutDir build\frames -From 0 -To 299
# build.mjs calls this with several frame ranges in parallel. Every scene is drawn from the
# timeline (scene start/end, line timings, events, per-frame voice levels) so audio and video stay in sync.
param(
  [Parameter(Mandatory = $true)][string]$Timeline,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [int]$From = 0,
  [int]$To = -1
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$TL = Get-Content -LiteralPath $Timeline -Raw -Encoding UTF8 | ConvertFrom-Json
$VW = [int]$TL.width; $VH = [int]$TL.height; $FPS = [double]$TL.fps
if ($To -lt 0) { $To = $TL.frames - 1 }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# ---------- palette (business/brand.json, site/index.html) ----------
$NAVY = '14213D'; $CREAM = 'F7F6F2'; $ORANGE = 'E07A1F'; $MUTED = 'BFD8D5'; $PANEL = '1B2A4A'; $LINE = '2B3A5C'; $WHITE = 'FFFFFF'; $INK2 = '5B6472'

$script:brushes = @{}; $script:pens = @{}; $script:fonts = @{}
function Col([string]$hex, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, [Convert]::ToInt32($hex.Substring(0, 2), 16), [Convert]::ToInt32($hex.Substring(2, 2), 16), [Convert]::ToInt32($hex.Substring(4, 2), 16))
}
function Brush([string]$hex, [int]$a = 255) {
  $k = "$hex-$a"; if (-not $script:brushes.ContainsKey($k)) { $script:brushes[$k] = New-Object System.Drawing.SolidBrush (Col $hex $a) }; return $script:brushes[$k]
}
function Pen([string]$hex, [double]$w, [int]$a = 255) {
  $k = "$hex-$a-$w"; if (-not $script:pens.ContainsKey($k)) { $p = New-Object System.Drawing.Pen (Col $hex $a), ([single]$w); $p.StartCap = 'Round'; $p.EndCap = 'Round'; $script:pens[$k] = $p }; return $script:pens[$k]
}
# Display and body faces: Archivo / Source Sans 3 when installed, else Segoe UI (the brand's stated fallback).
$installed = (New-Object System.Drawing.Text.InstalledFontCollection).Families | ForEach-Object { $_.Name }
$DISPLAY = if ($installed -contains 'Archivo') { 'Archivo' } else { 'Segoe UI' }
$BODY = if ($installed -contains 'Source Sans 3') { 'Source Sans 3' } else { 'Segoe UI' }
$BODYSEMI = if ($installed -contains 'Source Sans 3 Semibold') { 'Source Sans 3 Semibold' } elseif ($installed -contains 'Segoe UI Semibold') { 'Segoe UI Semibold' } else { $BODY }
function Font([string]$kind, [double]$px) {
  $k = "$kind-$px"
  if (-not $script:fonts.ContainsKey($k)) {
    switch ($kind) {
      'display' { $f = New-Object System.Drawing.Font $DISPLAY, ([single]$px), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel) }
      'semi'    { $f = New-Object System.Drawing.Font $BODYSEMI, ([single]$px), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel) }
      default   { $f = New-Object System.Drawing.Font $BODY, ([single]$px), ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel) }
    }
    $script:fonts[$k] = $f
  }
  return $script:fonts[$k]
}
$FORMATS = @{}
foreach ($al in 'left', 'center', 'right') {
  $sf = New-Object System.Drawing.StringFormat ([System.Drawing.StringFormat]::GenericTypographic)
  $sf.Alignment = @{ left = 'Near'; center = 'Center'; right = 'Far' }[$al]
  $sf.FormatFlags = $sf.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
  $FORMATS[$al] = $sf
}

# ---------- easing ----------
function Clamp01([double]$p) { if ($p -le 0) { return 0.0 }; if ($p -ge 1) { return 1.0 }; return $p }
function EaseOut([double]$p) { $p = Clamp01 $p; return 1 - [math]::Pow(1 - $p, 3) }
function EaseInOut([double]$p) { $p = Clamp01 $p; if ($p -lt 0.5) { return 4 * $p * $p * $p } else { return 1 - [math]::Pow(-2 * $p + 2, 3) / 2 } }
function Prog([double]$t, [double]$t0, [double]$d) { return EaseOut (($t - $t0) / $d) }
function A([double]$p) { return [int](255 * (Clamp01 $p)) }

# ---------- drawing helpers ----------
function RoundPath([double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath; $d = 2 * $r
  $p.AddArc([single]$x, [single]$y, [single]$d, [single]$d, 180, 90); $p.AddArc([single]($x + $w - $d), [single]$y, [single]$d, [single]$d, 270, 90)
  $p.AddArc([single]($x + $w - $d), [single]($y + $h - $d), [single]$d, [single]$d, 0, 90); $p.AddArc([single]$x, [single]($y + $h - $d), [single]$d, [single]$d, 90, 90)
  $p.CloseFigure(); return $p
}
function FillRound($g, [string]$hex, [int]$a, [double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $p = RoundPath $x $y $w $h $r; $g.FillPath((Brush $hex $a), $p); $p.Dispose()
}
function StrokeRound($g, [string]$hex, [int]$a, [double]$pw, [double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
  $p = RoundPath $x $y $w $h $r; $g.DrawPath((Pen $hex $pw $a), $p); $p.Dispose()
}
function Circle($g, [string]$hex, [int]$a, [double]$cx, [double]$cy, [double]$r) { $g.FillEllipse((Brush $hex $a), [single]($cx - $r), [single]($cy - $r), [single](2 * $r), [single](2 * $r)) }
function Ring($g, [string]$hex, [int]$a, [double]$pw, [double]$cx, [double]$cy, [double]$r) { $g.DrawEllipse((Pen $hex $pw $a), [single]($cx - $r), [single]($cy - $r), [single](2 * $r), [single](2 * $r)) }

# Text. Returns the height used. $w > 0 wraps inside that width.
function Txt($g, [string]$s, [string]$kind, [double]$px, [string]$hex, [double]$x, [double]$y, [double]$w = 0, [string]$align = 'left', [int]$a = 255) {
  if ($a -le 0 -or [string]::IsNullOrEmpty($s)) { return 0 }
  $f = Font $kind $px; $b = Brush $hex $a; $sfmt = $FORMATS[$align]
  if ($w -le 0) { $w = 4000; if ($align -eq 'center') { $x -= 2000 } elseif ($align -eq 'right') { $x -= 4000 } }
  $rect = New-Object System.Drawing.RectangleF ([single]$x), ([single]$y), ([single]$w), ([single]3000)
  $g.DrawString($s, $f, $b, $rect, $sfmt)
  $m = $g.MeasureString($s, $f, [int]$w, $sfmt); return [double]$m.Height
}
function TxtH($g, [string]$s, [string]$kind, [double]$px, [double]$w) { $m = $g.MeasureString($s, (Font $kind $px), [int]$w, $FORMATS["left"]); return [double]$m.Height }
function TxtW($g, [string]$s, [string]$kind, [double]$px) { $m = $g.MeasureString($s, (Font $kind $px), 4000, $FORMATS["left"]); return [double]$m.Width }

# The AfterRing mark: ring open at the top right, orange dot in the gap (business/logo/afterring-mark.svg).
function Mark($g, [double]$cx, [double]$cy, [double]$size, [string]$ringHex, [string]$dotHex, [int]$a = 255, [double]$dotScale = 1.0) {
  $s = $size / 1024.0; $r = 300 * $s
  $g.DrawArc((Pen $ringHex (110 * $s) $a), [single]($cx - $r), [single]($cy - $r), [single](2 * $r), [single](2 * $r), -10, 290)
  Circle $g $dotHex $a ($cx + 212.1 * $s) ($cy - 212.1 * $s) (72 * $s * $dotScale)
}
function Wordmark($g, [double]$x, [double]$cy, [double]$markSize, [double]$textPx, [string]$ringHex, [string]$dotHex, [string]$textHex, [int]$a = 255, [double]$dotScale = 1.0) {
  Mark $g ($x + $markSize * 0.42) $cy $markSize $ringHex $dotHex $a $dotScale
  Txt $g 'AfterRing' 'display' $textPx $textHex ($x + $markSize * 0.95) ($cy - $textPx * 0.62) 0 'left' $a | Out-Null
}
function Handset($g, [double]$cx, [double]$cy, [double]$size, [string]$hex, [int]$a, [double]$angle) {
  $st = $g.Save(); $g.TranslateTransform([single]$cx, [single]$cy); $g.RotateTransform([single]$angle)
  $r = $size * 0.36; $pw = $size * 0.2
  $g.DrawArc((Pen $hex $pw $a), [single](-$r), [single](-$r), [single](2 * $r), [single](2 * $r), 100, 160)
  $ex = $r * [math]::Cos(100 * [math]::PI / 180); $ey = $r * [math]::Sin(100 * [math]::PI / 180)
  Circle $g $hex $a $ex $ey ($size * 0.17); Circle $g $hex $a $ex (-$ey) ($size * 0.17)
  $g.Restore($st)
}
function Check($g, [double]$cx, [double]$cy, [double]$size, [string]$hex, [int]$a, [double]$pw) {
  $pts = @([System.Drawing.PointF]::new([single]($cx - $size * 0.32), [single]($cy + $size * 0.02)), [System.Drawing.PointF]::new([single]($cx - $size * 0.08), [single]($cy + $size * 0.26)), [System.Drawing.PointF]::new([single]($cx + $size * 0.34), [single]($cy - $size * 0.26)))
  $g.DrawLines((Pen $hex $pw $a), $pts)
}
function Cross($g, [double]$cx, [double]$cy, [double]$size, [string]$hex, [int]$a, [double]$pw) {
  $p = Pen $hex $pw $a; $s = $size * 0.28
  $g.DrawLine($p, [single]($cx - $s), [single]($cy - $s), [single]($cx + $s), [single]($cy + $s)); $g.DrawLine($p, [single]($cx + $s), [single]($cy - $s), [single]($cx - $s), [single]($cy + $s))
}
function Watermark($g) { Wordmark $g ($VW - 120 - 240) 96 76 40 $CREAM $ORANGE $CREAM 200 }
function Pill($g, [string]$s, [double]$x, [double]$y, [string]$bg, [string]$fg, [double]$px = 26, [int]$a = 255) {
  $w = (TxtW $g $s 'semi' $px) + 44; $h = $px * 1.9
  FillRound $g $bg $a $x $y $w $h ($h / 2); Txt $g $s 'semi' $px $fg ($x + 22) ($y + $h * 0.5 - $px * 0.62) 0 'left' $a | Out-Null
  return $w
}
function Ev($sc, [string]$id) { $v = $sc.events.$id; if ($null -eq $v) { return 1e9 }; return [double]$v }

# ---------- scenes ----------
function Scene-Logo($g, $sc, [double]$t) {
  $a = 255; $sc1 = 0.96 + 0.04 * (EaseOut ($t / 0.9)); $pulse = 1 + 0.14 * [math]::Max(0, [math]::Sin(($t - 0.5) * 4.2)) * (Clamp01 (($t - 0.5) * 3))
  $st = $g.Save(); $g.TranslateTransform([single]($VW / 2), [single]($VH / 2)); $g.ScaleTransform([single]$sc1, [single]$sc1); $g.TranslateTransform([single](-$VW / 2), [single](-$VH / 2))
  Wordmark $g 560 500 250 170 $CREAM $ORANGE $CREAM $a $pulse
  $g.Restore($st)
  Txt $g $TL.brand.tagline 'body' 46 $MUTED ($VW / 2) 690 0 'center' (A (($t - 0.45) / 0.5)) | Out-Null
}

function Scene-Shop($g, $sc, [double]$t) {
  $tx = $sc.text; $hang = Ev $sc 'hangup'; $comp = Ev $sc 'competitor'
  $phase = if ($t -ge $hang) { 2 } else { 1 }
  $cx = 520; $cy = 540
  # ringing: shake and ripple during each ring burst
  $ringing = $false; $shake = 0
  foreach ($rid in 'ring1', 'ring2') {
    $r0 = Ev $sc $rid; if ($t -ge $r0 -and $t -lt $r0 + 1.4) { $ringing = $true; $shake = 7 * [math]::Sin(($t - $r0) * 2 * [math]::PI * 11) * (1 - ($t - $r0) / 1.4) }
  }
  if ($phase -eq 1) {
    foreach ($k in 0, 1, 2) {
      $ph = (($t * 0.9) + $k / 3.0) % 1.0
      Ring $g $CREAM (A ((1 - $ph) * 0.55)) (6 - 3 * $ph) $cx $cy (230 + 260 * $ph)
    }
    Circle $g $PANEL 255 $cx $cy 200
    Handset $g $cx $cy 230 $CREAM 255 (-45 + $shake)
    $secs = [math]::Min(15, [int][math]::Floor($t / ($hang - 0.2) * 15))
    Txt $g ("0:{0:00}" -f $secs) 'display' 150 $CREAM 1080 360 0 'left' (A ($t / 0.4)) | Out-Null
    Txt $g 'unanswered' 'body' 42 $MUTED 1086 530 0 'left' (A ($t / 0.4)) | Out-Null
    Txt $g $tx.caption 'body' 44 $CREAM 1080 640 720 'left' (A (($t - 0.2) / 0.5)) | Out-Null
  } else {
    $p = Prog $t $hang 0.5
    Circle $g $PANEL 255 $cx $cy 200
    Handset $g $cx $cy 230 $CREAM (A (1 - $p * 0.7)) (-45 + 60 * $p)
    Cross $g ($cx + 150) ($cy - 150) 110 $ORANGE (A $p) 18
    Txt $g $tx.hangup 'display' 66 $CREAM 1080 250 800 'left' (A $p) | Out-Null
    $p2 = Prog $t $comp 0.5
    if ($p2 -gt 0) {
      $y = 560 + 40 * (1 - $p2); $al = A $p2
      Txt $g $tx.competitor 'body' 44 $MUTED 1080 ($y - 70) 760 'left' $al | Out-Null
      FillRound $g $CREAM $al 1080 ($y + 10) 700 76 38
      Txt $g 'heating repair near me' 'body' 34 $NAVY 1112 ($y + 27) 0 'left' $al | Out-Null
      Circle $g $NAVY $al 1740 ($y + 48) 14; $g.DrawLine((Pen $NAVY 6 $al), [single]1750, [single]($y + 58), [single]1762, [single]($y + 70))
      $rows = @('Your company', 'Next name on the list', 'Another competitor')
      for ($i = 0; $i -lt 3; $i++) {
        $ry = $y + 110 + $i * 66; $hi = ($i -eq 1)
        $bg = if ($hi) { $ORANGE } else { $PANEL }; $fg = if ($hi) { $NAVY } else { $MUTED }
        FillRound $g $bg $al 1080 $ry 700 54 12
        Txt $g $rows[$i] 'semi' 30 $fg 1104 ($ry + 10) 0 'left' $al | Out-Null
        if ($hi) { Txt $g 'answered' 'semi' 26 $NAVY 1756 ($ry + 13) 0 'right' $al | Out-Null } elseif ($i -eq 0) { Txt $g 'no answer' 'body' 26 $MUTED 1756 ($ry + 13) 0 'right' $al | Out-Null }
      }
    }
  }
}

function Scene-Statement($g, $sc, [double]$t) {
  $tx = $sc.text; $lines = $tx.headline -split "`n"; $y = 330
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $p = Prog $t (0.05 + 0.12 * $i) 0.55
    Txt $g $lines[$i] 'display' 124 $CREAM ($VW / 2) ($y + 40 * (1 - $p)) 0 'center' (A $p) | Out-Null; $y += 150
  }
  $p = Prog $t 0.5 0.6; $bw = 260 * $p
  $g.FillRectangle((Brush $ORANGE 255), [single]($VW / 2 - $bw / 2), [single]($y + 30), [single]$bw, [single]10)
  Txt $g $tx.sub 'body' 48 $MUTED ($VW / 2) ($y + 80) 0 'center' (A (($t - 0.8) / 0.5)) | Out-Null
}

function Scene-Stats($g, $sc, [double]$t) {
  $tx = $sc.text; $stats = @($tx.stats); $n = $stats.Count
  Txt $g $tx.headline 'display' 86 $CREAM 120 140 1600 'left' (A ($t / 0.4)) | Out-Null
  $cw = 520; $gap = 50; $x0 = (1920 - ($n * $cw + ($n - 1) * $gap)) / 2
  for ($i = 0; $i -lt $n; $i++) {
    $p = Prog $t (Ev $sc ("stat{0}" -f ($i + 1))) 0.55; if ($p -le 0) { continue }
    $x = $x0 + $i * ($cw + $gap); $y = 360 + 36 * (1 - $p); $al = A $p
    FillRound $g $PANEL $al $x $y $cw 400 26
    $g.FillRectangle((Brush $ORANGE $al), [single]($x + 44), [single]($y + 44), [single](90 * $p), [single]8)
    Txt $g $stats[$i].big 'display' 136 $CREAM ($x + 40) ($y + 80) 0 'left' $al | Out-Null
    Txt $g $stats[$i].sub 'body' 36 $MUTED ($x + 44) ($y + 262) ($cw - 88) 'left' $al | Out-Null
  }
  Txt $g $tx.source 'body' 26 $MUTED 120 920 1500 'left' (A (($t - 0.6) / 0.5)) | Out-Null
}

function Scene-Flow($g, $sc, [double]$t) {
  $tx = $sc.text
  Txt $g $tx.headline 'display' 86 $CREAM 120 150 1500 'left' (A ($t / 0.4)) | Out-Null
  $steps = @($tx.steps); $n = $steps.Count; $cw = 370; $gap = 48; $x0 = ($VW - ($n * $cw + ($n - 1) * $gap)) / 2; $cy = 430; $ch = 380
  for ($i = 0; $i -lt $n; $i++) {
    $p = Prog $t (Ev $sc ("step{0}" -f ($i + 1))) 0.5; if ($p -le 0) { continue }
    $x = $x0 + $i * ($cw + $gap); $y = $cy + 30 * (1 - $p); $al = A $p
    $last = ($i -eq $n - 1); $skip = ($i -eq 1)
    if ($i -gt 0) { $g.DrawLine((Pen $LINE 6 $al), [single]($x - $gap + 8), [single]($cy + $ch / 2), [single]($x - 8), [single]($cy + $ch / 2)) }
    if ($last) { FillRound $g $CREAM $al $x $y $cw $ch 22; StrokeRound $g $ORANGE $al 8 $x $y $cw $ch 22 }
    elseif ($skip) { FillRound $g $PANEL $al $x $y $cw $ch 22; StrokeRound $g $LINE $al 3 $x $y $cw $ch 22 }
    else { FillRound $g $PANEL $al $x $y $cw $ch 22 }
    $fg = if ($last) { $NAVY } else { $CREAM }; $sub = if ($last) { $INK2 } else { $MUTED }
    # icon
    $ix = $x + 48; $iy = $y + 60
    switch ($i) {
      0 { Handset $g ($ix + 28) ($iy + 28) 64 $CREAM $al -45 }
      1 { Circle $g $CREAM $al ($ix + 28) ($iy + 28) 30; Check $g ($ix + 28) ($iy + 28) 44 $NAVY $al 7 }
      2 { Ring $g $ORANGE $al 7 ($ix + 28) ($iy + 28) 28; $g.DrawLine((Pen $ORANGE 7 $al), [single]($ix + 28), [single]($iy + 28), [single]($ix + 28), [single]($iy + 8)); $g.DrawLine((Pen $ORANGE 7 $al), [single]($ix + 28), [single]($iy + 28), [single]($ix + 42), [single]($iy + 36)) }
      3 { Mark $g ($ix + 28) ($iy + 28) 74 $NAVY $ORANGE $al }
    }
    Txt $g ("0{0}" -f ($i + 1)) 'semi' 26 $ORANGE ($x + $cw - 36) ($y + 34) 0 'right' $al | Out-Null
    Txt $g $steps[$i].title 'display' 36 $fg ($x + 36) ($y + 150) ($cw - 72) 'left' $al | Out-Null
    Txt $g $steps[$i].sub 'body' 28 $sub ($x + 36) ($y + 262) ($cw - 72) 'left' $al | Out-Null
  }
}

function Scene-Call($g, $sc, [double]$t, [int]$frame) {
  $tx = $sc.text; $lines = @($sc.lines)
  $lvR = 0.0; $lvC = 0.0
  if ($TL.levels.receptionist) { $lvR = [double]$TL.levels.receptionist[$frame] }
  if ($TL.levels.caller) { $lvC = [double]$TL.levels.caller[$frame] }
  $ain = A ($t / 0.4)
  # simulation label, always on
  Pill $g $tx.label 120 72 $ORANGE $NAVY 28 255 | Out-Null
  Txt $g $tx.businessSub 'body' 28 $MUTED 120 140 0 'left' 255 | Out-Null
  # phone card
  $px = 120; $py = 210; $pw = 720; $ph = 760
  FillRound $g $PANEL $ain $px $py $pw $ph 30
  Txt $g $tx.business 'display' 44 $CREAM ($px + $pw / 2) ($py + 44) 0 'center' $ain | Out-Null
  $secs = [int][math]::Floor([math]::Max(0, $t - 0.6)); Txt $g ("{0}:{1:00}" -f [math]::Floor($secs / 60), ($secs % 60)) 'body' 34 $MUTED ($px + $pw / 2) ($py + 110) 0 'center' $ain | Out-Null
  $pulse = 1 + 0.18 * $lvR
  Circle $g $NAVY $ain ($px + $pw / 2) ($py + 310) 150; Ring $g $ORANGE (A (0.35 + 0.65 * $lvR)) 5 ($px + $pw / 2) ($py + 310) (158 + 26 * $lvR)
  Mark $g ($px + $pw / 2) ($py + 310) 215 $CREAM $ORANGE $ain $pulse
  Txt $g $tx.receptionistName 'semi' 32 $CREAM ($px + $pw / 2) ($py + 500) 0 'center' $ain | Out-Null
  Txt $g $tx.status 'body' 27 $MUTED ($px + $pw / 2) ($py + 548) 0 'center' $ain | Out-Null
  # waveforms: receptionist (cream) and caller (orange)
  $rows = @(@{ lv = $lvR; hex = $CREAM; label = 'AI receptionist' }, @{ lv = $lvC; hex = $ORANGE; label = ("Caller: {0}" -f $tx.callerName) })
  for ($r = 0; $r -lt 2; $r++) {
    $wy = $py + 640 + $r * 54; $bars = 24; $bw = 9; $gp = 6; $wx = $px + 330
    Txt $g $rows[$r].label 'body' 26 $rows[$r].hex ($px + 44) ($wy - 16) 0 'left' $ain | Out-Null
    for ($b = 0; $b -lt $bars; $b++) {
      $env = [math]::Sin($b / $bars * [math]::PI); $jit = 0.55 + 0.45 * [math]::Abs([math]::Sin($b * 1.73 + $frame * 0.71 + $r * 9))
      $hgt = 4 + 64 * [math]::Sqrt($rows[$r].lv) * $env * $jit
      FillRound $g $rows[$r].hex $ain ($wx + $b * ($bw + $gp)) ($wy - $hgt / 2) $bw $hgt 4
    }
  }
  # transcript
  $tx0 = 900; $tw = 900; $ty0 = 210; $th = 760; $bubbleW = 700; $font = 36; $pad = 26; $gapY = 22
  $shown = @(); foreach ($l in $lines) { if ($t -ge [double]$l.t0) { $shown += $l } }
  if ($shown.Count -gt 0) {
    $heights = @(); $total = 0
    foreach ($l in $shown) { $hh = (TxtH $g $l.text 'body' $font ($bubbleW - 2 * $pad)) + 2 * $pad + 30; $heights += $hh; $total += $hh + $gapY }
    $newest = $shown[-1]; $prevTotal = $total - $heights[-1] - $gapY
    $offNew = [math]::Max(0, $total - $th); $offPrev = [math]::Max(0, $prevTotal - $th)
    $off = $offPrev + ($offNew - $offPrev) * (Prog $t ([double]$newest.t0) 0.4)
    $y = $ty0 - $off
    for ($i = 0; $i -lt $shown.Count; $i++) {
      $l = $shown[$i]; $hh = $heights[$i]; $isR = ($l.speaker -eq 'receptionist')
      $p = Prog $t ([double]$l.t0) 0.35; $al = A $p; $yy = $y + 18 * (1 - $p)
      if ($yy + $hh -gt $ty0 - 40 -and $yy -lt $ty0 + $th + 40) {
        $bx = if ($isR) { $tx0 } else { $tx0 + $tw - $bubbleW }
        $bg = if ($isR) { $CREAM } else { $ORANGE }
        $who = if ($isR) { 'Kylie (AI)' } else { $tx.callerName }
        FillRound $g $bg $al $bx $yy $bubbleW $hh 22
        Txt $g $who 'semi' 24 $INK2 ($bx + $pad) ($yy + 14) 0 'left' $al | Out-Null
        Txt $g $l.text 'body' $font $NAVY ($bx + $pad) ($yy + 44) ($bubbleW - 2 * $pad) 'left' $al | Out-Null
      }
      $y += $hh + $gapY
    }
  }
  # booking badge once the last line starts
  $last = $lines[-1]; $pb = Prog $t ([double]$last.t0 + 0.3) 0.5
  if ($pb -gt 0) {
    $bx = $tx0; $by = $ty0 + $th + 10 - 20 * (1 - $pb); $al = A $pb
    FillRound $g $ORANGE $al $bx $by 470 72 36; Circle $g $NAVY $al ($bx + 38) ($by + 36) 22; Check $g ($bx + 38) ($by + 36) 30 $ORANGE $al 5
    Txt $g $tx.booked 'semi' 32 $NAVY ($bx + 76) ($by + 17) 0 'left' $al | Out-Null
  }
  # mask overflow above the transcript area; fade only the bubble being cut (a gradient over plain navy bands after encoding)
  $g.FillRectangle((Brush $NAVY 255), [single]($tx0 - 10), 0, [single]($tw + 40), [single]($ty0 - 4))
  if ($shown.Count -gt 0 -and $off -gt 0) {
    $y = $ty0 - $off
    for ($i = 0; $i -lt $shown.Count; $i++) {
      $hh = $heights[$i]; $isR = ($shown[$i].speaker -eq 'receptionist'); $bx = if ($isR) { $tx0 } else { $tx0 + $tw - $bubbleW }
      if ($y -lt $ty0 - 4 -and $y + $hh -gt $ty0 - 4) {
        $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.PointF]::new([single]0, [single]($ty0 - 5))), ([System.Drawing.PointF]::new([single]0, [single]($ty0 + 70))), (Col $NAVY 255), (Col $NAVY 0)
        $g.FillRectangle($grad, [single]$bx, [single]($ty0 - 5), [single]$bubbleW, [single]75); $grad.Dispose()
      }
      $y += $hh + $gapY
    }
  }
  Watermark $g
}

function Scene-Owner($g, $sc, [double]$t) {
  $tx = $sc.text
  Txt $g $tx.headline 'display' 76 $CREAM 120 120 1600 'left' (A ($t / 0.4)) | Out-Null
  $top = 290; $ch = 600
  # phone with the text alert
  $p = Prog $t (Ev $sc 'text') 0.6
  if ($p -gt 0) {
    $x = 120; $y = $top + 40 * (1 - $p); $w = 360; $al = A $p
    FillRound $g $PANEL $al $x $y $w $ch 44; StrokeRound $g $LINE $al 4 $x $y $w $ch 44
    FillRound $g $NAVY $al ($x + 110) ($y + 16) 140 26 13
    Txt $g $tx.smsLabel 'semi' 24 $MUTED ($x + $w / 2) ($y + 60) 0 'center' $al | Out-Null
    $pn = Prog $t ((Ev $sc 'text') + 0.25) 0.5
    if ($pn -gt 0) {
      $ny = $y + 110 - 30 * (1 - $pn); $aln = A ($pn * $p)
      FillRound $g $CREAM $aln ($x + 22) $ny ($w - 44) 250 22
      Mark $g ($x + 52) ($ny + 34) 40 $NAVY $ORANGE $aln
      Txt $g $tx.smsFrom 'semi' 24 $NAVY ($x + 80) ($ny + 20) 0 'left' $aln | Out-Null
      Txt $g $tx.smsWhen 'body' 22 $INK2 ($x + $w - 42) ($ny + 22) 0 'right' $aln | Out-Null
      Txt $g $tx.smsBody 'body' 27 $NAVY ($x + 42) ($ny + 70) ($w - 84) 'left' $aln | Out-Null
    }
    FillRound $g $LINE $al ($x + 120) ($y + $ch - 26) 120 8 4
  }
  # email card
  $p = Prog $t (Ev $sc 'email') 0.6
  if ($p -gt 0) {
    $x = 540 - 40 * (1 - $p); $y = $top; $w = 760; $al = A $p
    FillRound $g $WHITE $al $x $y $w $ch 24
    $g.FillRectangle((Brush $NAVY $al), [single]$x, [single]$y, [single]$w, [single]84)
    Mark $g ($x + 50) ($y + 42) 54 $CREAM $ORANGE $al
    Txt $g ("{0}  to you" -f $tx.emailFrom) 'semi' 27 $CREAM ($x + 92) ($y + 26) 0 'left' $al | Out-Null
    Txt $g '2:06 pm' 'body' 24 $MUTED ($x + $w - 28) ($y + 28) 0 'right' $al | Out-Null
    Txt $g $tx.emailSubject 'display' 34 $NAVY ($x + 36) ($y + 112) ($w - 72) 'left' $al | Out-Null
    $yy = $y + 230
    foreach ($ln in @($tx.emailBody)) { $yy += (Txt $g $ln 'body' 29 $NAVY ($x + 36) $yy ($w - 72) 'left' $al) + 16 }
    Pill $g 'Transcript.txt' ($x + 36) ($y + $ch - 82) $CREAM $NAVY 23 $al | Out-Null
  }
  # calendar card
  $p = Prog $t (Ev $sc 'calendar') 0.6
  if ($p -gt 0) {
    $x = 1340 + 50 * (1 - $p); $y = $top; $w = 460; $al = A $p
    FillRound $g $WHITE $al $x $y $w $ch 24
    $g.FillRectangle((Brush $NAVY $al), [single]$x, [single]$y, [single]$w, [single]84)
    Txt $g 'Wednesday' 'semi' 28 $CREAM ($x + 32) ($y + 26) 0 'left' $al | Out-Null
    Txt $g 'Your calendar' 'body' 23 $MUTED ($x + $w - 28) ($y + 30) 0 'right' $al | Out-Null
    $hours = @('7 am', '8 am', '9 am', '10 am'); $rowH = 112
    for ($i = 0; $i -lt 4; $i++) {
      $ry = $y + 120 + $i * $rowH
      Txt $g $hours[$i] 'body' 24 $INK2 ($x + 30) ($ry - 13) 0 'left' $al | Out-Null
      $g.DrawLine((Pen 'D9DDE3' 2 $al), [single]($x + 104), [single]$ry, [single]($x + $w - 30), [single]$ry)
    }
    $ey = $y + 120 + $rowH; $pe = Prog $t ((Ev $sc 'calendar') + 0.25) 0.4
    if ($pe -gt 0) {
      $ale = A ($pe * $p)
      FillRound $g $ORANGE $ale ($x + 112) ($ey + 4) ($w - 146) ($rowH - 8) 14
      Txt $g $tx.calTitle 'semi' 26 $NAVY ($x + 128) ($ey + 12) ($w - 176) 'left' $ale | Out-Null
      Txt $g $tx.calWhen 'body' 24 $NAVY ($x + 128) ($ey + 74) ($w - 176) 'left' $ale | Out-Null
    }
    Pill $g $tx.calSource ($x + 30) ($y + $ch - 82) $NAVY $CREAM 22 $al | Out-Null
  }
  Watermark $g
}

function Scene-List($g, $sc, [double]$t) {
  $tx = $sc.text; $items = @($tx.items); $lines = @($sc.lines)
  Txt $g $tx.headline 'display' 86 $CREAM 120 130 1200 'left' (A ($t / 0.4)) | Out-Null
  $cur = -1; for ($i = 0; $i -lt $lines.Count; $i++) { if ($t -ge [double]$lines[$i].t0 - 0.05) { $cur = $i } }
  for ($i = 0; $i -lt $items.Count; $i++) {
    $t0 = if ($i -lt $lines.Count) { [double]$lines[$i].t0 - 0.05 } else { 0.3 * $i }
    $p = Prog $t $t0 0.5; if ($p -le 0) { continue }
    $dim = if ($i -eq $cur) { 1.0 } else { 0.55 }
    $y = 320 + $i * 200 + 24 * (1 - $p); $al = A ($p * $dim)
    FillRound $g $PANEL $al 120 $y 1680 160 24
    Circle $g $ORANGE $al 200 ($y + 80) 40; Check $g 200 ($y + 80) 52 $NAVY $al 8
    Txt $g $items[$i].title 'display' 50 $CREAM 280 ($y + 26) 1480 'left' $al | Out-Null
    Txt $g $items[$i].sub 'body' 32 $MUTED 280 ($y + 96) 1480 'left' $al | Out-Null
  }
  Watermark $g
}

function Scene-Offer($g, $sc, [double]$t) {
  $tx = $sc.text
  $p = Prog $t 0.05 0.5
  Txt $g $tx.headline 'display' 130 $CREAM 120 (300 + 30 * (1 - $p)) 1000 'left' (A $p) | Out-Null
  $p = Prog $t 0.35 0.5
  Txt $g $tx.sub 'body' 50 $MUTED 120 (480 + 20 * (1 - $p)) 860 'left' (A $p) | Out-Null
  $g.FillRectangle((Brush $ORANGE 255), [single]120, [single]640, [single](220 * (Prog $t 0.6 0.5)), [single]10)
  $p = Prog $t (Ev $sc 'price') 0.6
  if ($p -gt 0) {
    $x = 1100 + 70 * (1 - $p); $y = 200; $w = 700; $h = 680; $al = A $p
    FillRound $g $CREAM $al $x $y $w $h 28
    $g.FillRectangle((Brush $ORANGE $al), [single]$x, [single]($y + 28), [single]14, [single]($h - 56))
    Txt $g $tx.planName.ToUpper() 'semi' 30 $ORANGE ($x + 60) ($y + 50) 0 'left' $al | Out-Null
    Txt $g $tx.planPrice 'display' 170 $NAVY ($x + 52) ($y + 90) 0 'left' $al | Out-Null
    Txt $g $tx.planUnit 'body' 42 $INK2 ($x + 60) ($y + 300) 0 'left' $al | Out-Null
    $g.DrawLine((Pen 'D9DDE3' 3 $al), [single]($x + 60), [single]($y + 380), [single]($x + $w - 60), [single]($y + 380))
    $pf = Prog $t ((Ev $sc 'price') + 0.5) 0.5; $alf = A ($pf * $p)
    Txt $g $tx.planFee 'display' 48 $NAVY ($x + 60) ($y + 405) 0 'left' $alf | Out-Null
    Txt $g $tx.planFeeSub 'body' 30 $INK2 ($x + 60) ($y + 470) ($w - 120) 'left' $alf | Out-Null
    Txt $g $tx.planSub 'body' 27 $INK2 ($x + 60) ($y + 560) ($w - 120) 'left' $al | Out-Null
  }
  Watermark $g
}

function Scene-End($g, $sc, [double]$t) {
  $tx = $sc.text; $b = $TL.brand
  $pulse = 1 + 0.16 * [math]::Max(0, [math]::Sin(($t - 0.4) * 3.6))
  Wordmark $g 600 300 220 150 $CREAM $ORANGE $CREAM 255 $pulse
  Txt $g $b.tagline 'body' 48 $MUTED ($VW / 2) 470 0 'center' (A (($t - 0.2) / 0.5)) | Out-Null
  $p = Prog $t 0.9 0.6
  if ($p -gt 0) {
    $al = A $p; $y = 600 + 20 * (1 - $p)
    Txt $g $tx.demoLabel.ToUpper() 'semi' 30 $ORANGE ($VW / 2) $y 0 'center' $al | Out-Null
    Txt $g $tx.demoNumber 'display' 110 $CREAM ($VW / 2) ($y + 40) 0 'center' $al | Out-Null
  }
  $p = Prog $t 1.6 0.6
  if ($p -gt 0) {
    $al = A $p; $y = 820 + 20 * (1 - $p)
    Txt $g $tx.email 'body' 40 $CREAM ($VW / 2 - 40) $y 0 'right' $al | Out-Null
    $g.DrawLine((Pen $ORANGE 4 $al), [single]($VW / 2), [single]($y + 6), [single]($VW / 2), [single]($y + 46))
    Txt $g $tx.booking 'body' 40 $CREAM ($VW / 2 + 40) $y 0 'left' $al | Out-Null
  }
  Txt $g $tx.footer 'body' 28 $MUTED ($VW / 2) 980 0 'center' (A (($t - 2.0) / 0.6)) | Out-Null
}

# ---------- main loop ----------
$bmp = New-Object System.Drawing.Bitmap $VW, $VH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
$scenes = @($TL.scenes)
$sw = [System.Diagnostics.Stopwatch]::StartNew()
for ($i = $From; $i -le $To; $i++) {
  $t = $i / $FPS
  $sc = $scenes[0]; foreach ($s in $scenes) { if ($t -ge [double]$s.start - 1e-6) { $sc = $s } }
  $lt = $t - [double]$sc.start
  $g.Clear((Col $NAVY))
  switch ($sc.type) {
    'logo'      { Scene-Logo $g $sc $lt }
    'shop'      { Scene-Shop $g $sc $lt; Watermark $g }
    'statement' { Scene-Statement $g $sc $lt; Watermark $g }
    'stats'     { Scene-Stats $g $sc $lt; Watermark $g }
    'flow'      { Scene-Flow $g $sc $lt; Watermark $g }
    'call'      { Scene-Call $g $sc $lt $i }
    'owner'     { Scene-Owner $g $sc $lt }
    'list'      { Scene-List $g $sc $lt }
    'offer'     { Scene-Offer $g $sc $lt }
    'end'       { Scene-End $g $sc $lt }
  }
  # flash cut: a few solid frames at the start of each scene (white or orange, alternating)
  if ($sc.flash) {
    $f0 = [int][math]::Ceiling([double]$sc.start * $FPS - 1e-6); $k = $i - $f0; $n = [int]$sc.flashFrames
    if ($k -ge 0 -and $k -lt $n) {
      $hex = if ($sc.flash -eq 'orange') { $ORANGE } else { $WHITE }
      $al = [int](255 * [double]$sc.flashAlpha[[math]::Min($k, $sc.flashAlpha.Count - 1)])
      $g.FillRectangle((Brush $hex $al), 0, 0, $VW, $VH)
    }
  }
  $bmp.Save((Join-Path $OutDir ("f{0:00000}.png" -f $i)), [System.Drawing.Imaging.ImageFormat]::Png)
  if (($i - $From) % 150 -eq 0 -and $i -gt $From) { Write-Output ("frame {0}/{1} ({2:0.0} fps)" -f $i, $To, (($i - $From) / ($sw.ElapsedMilliseconds / 1000.0))) }
}
Write-Output ("frames {0}..{1} done in {2:0.0} s" -f $From, $To, ($sw.ElapsedMilliseconds / 1000.0))
$g.Dispose(); $bmp.Dispose()
foreach ($b in $script:brushes.Values) { $b.Dispose() }; foreach ($p in $script:pens.Values) { $p.Dispose() }; foreach ($f in $script:fonts.Values) { $f.Dispose() }
