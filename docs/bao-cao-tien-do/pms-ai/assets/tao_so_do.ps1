Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$assetRoot = $PSScriptRoot
$script:font = [System.Drawing.Font]::new('Arial', 31)
$script:smallFont = [System.Drawing.Font]::new('Arial', 27)
$script:titleFont = [System.Drawing.Font]::new('Arial', 40, [System.Drawing.FontStyle]::Bold)
$script:ink = [System.Drawing.ColorTranslator]::FromHtml('#183149')
$script:blue = [System.Drawing.ColorTranslator]::FromHtml('#EAF2FB')
$script:orange = [System.Drawing.ColorTranslator]::FromHtml('#FFF1D9')
$script:green = [System.Drawing.ColorTranslator]::FromHtml('#E8F4EC')

function New-Canvas([int]$height) {
    $script:bitmap = [System.Drawing.Bitmap]::new(1600, $height)
    $script:graphics = [System.Drawing.Graphics]::FromImage($script:bitmap)
    $script:graphics.Clear([System.Drawing.Color]::White)
    $script:graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $script:graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
}

function Text([string]$value, [float]$x, [float]$y, [float]$w, [float]$h, $textFont = $script:font) {
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $brush = [System.Drawing.SolidBrush]::new($script:ink)
    $fitFont = [System.Drawing.Font]::new($textFont.FontFamily, $textFont.Size, $textFont.Style)
    while (($script:graphics.MeasureString($value, $fitFont, [int]$w).Height -gt $h) -and ($fitFont.Size -gt 21)) {
        $nextSize = $fitFont.Size - 0.5
        $fitFont.Dispose()
        $fitFont = [System.Drawing.Font]::new($textFont.FontFamily, $nextSize, $textFont.Style)
    }
    $script:graphics.DrawString($value, $fitFont, $brush, [System.Drawing.RectangleF]::new($x,$y,$w,$h), $format)
    $fitFont.Dispose()
    $format.Dispose()
    $brush.Dispose()
}

function Box([string]$value, [float]$x, [float]$y, [float]$w, [float]$h, $fill = $script:blue, [bool]$planned = $false) {
    $brush = [System.Drawing.SolidBrush]::new($fill)
    $pen = [System.Drawing.Pen]::new($script:ink, 2.5)
    if ($planned) {$pen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash}
    $script:graphics.FillRectangle($brush, $x,$y,$w,$h)
    $script:graphics.DrawRectangle($pen, $x,$y,$w,$h)
    Text $value ($x+15) ($y+8) ($w-30) ($h-16)
    $brush.Dispose()
    $pen.Dispose()
}

function Arrow([float]$x1,[float]$y1,[float]$x2,[float]$y2,[bool]$both = $false) {
    $pen = [System.Drawing.Pen]::new($script:ink, 3)
    $pen.CustomEndCap = [System.Drawing.Drawing2D.AdjustableArrowCap]::new(6,7)
    if ($both) {$pen.CustomStartCap = [System.Drawing.Drawing2D.AdjustableArrowCap]::new(6,7)}
    $script:graphics.DrawLine($pen,$x1,$y1,$x2,$y2)
    $pen.Dispose()
}

function Save-Canvas([string]$name) {
    $script:bitmap.Save((Join-Path $assetRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $script:graphics.Dispose()
    $script:bitmap.Dispose()
    Write-Output $name
}

New-Canvas 1160
Text 'KIẾN TRÚC HỆ THỐNG PMS KẾT HỢP AI' 50 20 1500 65 $script:titleFont
Box 'Chủ khách sạn  |  Lễ tân  |  Buồng phòng  |  Kế toán' 100 115 1400 95
Box 'Giao diện Web React' 540 270 520 95
Arrow 800 210 800 270
Box "Flask API: xác thực • khách sạn • phân quyền`nNghiệp vụ PMS • Báo cáo • Nhật ký" 350 425 900 130
Arrow 800 365 800 425
Box 'PostgreSQL: dữ liệu theo khách sạn' 540 660 520 115 $script:green
Arrow 800 555 800 660 $true
Box "Adapter Channex`nHàng đợi / worker" 25 660 430 115
Arrow 350 510 240 660 $true
Box "Channex sandbox`nĐồng bộ OTA" 25 860 430 110
Arrow 240 775 240 860 $true
Box "DỰ KIẾN: Adapter AI`nCông cụ đọc cho phép" 1120 650 455 135 $script:orange $true
Arrow 1250 510 1345 650 $true
Box "DỰ KIẾN: Dịch vụ AI`nTóm tắt / diễn đạt" 1120 865 455 110 $script:orange $true
Arrow 1345 785 1345 865 $true
Text "AI đọc số liệu tổng hợp từ API và tài liệu đã duyệt;`nkhông truy cập DB trực tiếp, không có công cụ ghi nghiệp vụ." 475 850 620 150 $script:smallFont
Text 'Chỉ dữ liệu tổng hợp đã tối thiểu hóa được gửi ra dịch vụ AI; không gửi dữ liệu định danh khách.' 80 1035 1440 85 $script:smallFont
Save-Canvas 'kien-truc-he-thong.png'

New-Canvas 1450
Text 'LUỒNG TRỢ LÝ AI — THIẾT KẾ DỰ KIẾN' 50 20 1500 65 $script:titleFont
$steps = @(
    '1. Người dùng gửi câu hỏi tiếng Việt',
    '2. Kiểm tra phiên, khách sạn và vai trò',
    '3. Chọn công cụ cho phép; kiểm tra tham số',
    '4. Gọi API báo cáo theo quyền hiện tại',
    '5. Lọc và tối thiểu hóa dữ liệu tổng hợp',
    '6. AI soạn câu trả lời từ dữ liệu được cấp',
    '7. Kiểm tra số liệu và nguồn tham chiếu',
    '8. Trả lời kèm nguồn và thời điểm dữ liệu'
)
for ($i=0; $i -lt $steps.Count; $i++) {
    $nodeY = 125 + 150*$i
    Box $steps[$i] 480 $nodeY 640 110 $script:orange $true
    if ($i -gt 0) {Arrow 800 ($nodeY-40) 800 $nodeY}
}
Box 'Từ chối yêu cầu vượt quyền' 1180 275 380 110
Arrow 1120 330 1180 330
Box 'Hỏi lại khi thiếu hoặc mơ hồ' 25 425 395 110
Arrow 480 480 420 480
Box "AI lỗi / hết thời gian:`nhiển thị báo cáo gốc" 1180 875 380 165
Arrow 1120 930 1180 930
Box 'Số liệu không khớp: không hiển thị bản AI' 25 1025 395 150
Arrow 480 1080 420 1080
Text 'Mọi truy vấn đều kiểm tra quyền tại máy chủ. Không sinh SQL tùy ý; không thay đổi đặt phòng, tiền hoặc giá.' 70 1345 1460 75 $script:smallFont
Save-Canvas 'luong-tro-ly-ai.png'

New-Canvas 1000
Text 'TRẠNG THÁI NGHIỆP VỤ CHÍNH' 50 20 1500 65 $script:titleFont
Text 'Vòng đời đặt phòng' 50 110 1500 55 $script:font
Box 'Đã đặt' 110 200 360 100
Box 'Đang ở' 620 200 360 100
Box 'Đã trả phòng' 1130 200 360 100 $script:green
Arrow 470 250 620 250
Arrow 980 250 1130 250
Text 'Nhận phòng' 465 160 160 60 $script:smallFont
Text 'Trả phòng' 980 160 150 60 $script:smallFont
Box 'Đã hủy / Không đến' 110 390 440 110
Arrow 290 300 290 390
Text 'Hai nhánh kết thúc thay thế từ booking chưa nhận phòng' 610 390 865 110 $script:smallFont
Text 'Trạng thái buồng phòng sau sự kiện trả phòng' 50 575 1500 65 $script:font
$roomTexts = @('Sự kiện:`nTrả phòng','Bẩn','Đang dọn','Chờ kiểm tra','Sạch')
for ($i=0; $i -lt $roomTexts.Count; $i++) {
    $nodeX = 50 + 305*$i
    $label = $roomTexts[$i].Replace('`n',"`n")
    Box $label $nodeX 705 270 120 $script:green
    if ($i -gt 0) {Arrow ($nodeX-35) 765 $nodeX 765}
}
Text 'Checkout tạo việc dọn trong cùng giao dịch. Chỉ xác nhận phòng sạch sau khi kiểm tra đúng quyền.' 80 880 1440 75 $script:smallFont
Save-Canvas 'trang-thai-nghiep-vu.png'

$script:font.Dispose()
$script:smallFont.Dispose()
$script:titleFont.Dispose()
