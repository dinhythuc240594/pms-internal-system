# Bàn giao 2026-11-27 — Loc

**Công việc:** Thông báo và sự kiện trong ứng dụng + Layout và Dashboard quản trị nền tảng  
**Backend:** Thông báo và sự kiện trong ứng dụng (4 file)  
**Frontend:** Layout và Dashboard quản trị nền tảng (6 file)  
**Nhánh:** `work/2026-11-27-loc-fullstack-20`  
**Commit message:** `feat(fullstack): ban giao 27/11/2026 - Loc`  
**Số file:** 10  
**Gói trước cần ghép:** 26_11_2026_Loc, 26_11_2026_Thuc

## Copy/paste

1. Đồng bộ `main` của repo đích; merge cả hai gói ngày trước trong `LICH_PUSH.csv`. Hai người có thể tạo nhánh của cùng ngày từ cùng mốc main; file của hai gói không trùng nhau.
2. Tạo nhánh bên dưới. Copy **nội dung bên trong `source/`** vào **thư mục gốc repo đích**. Chọn Replace/Overwrite nếu file đã tồn tại; thêm file mới nếu chưa có.
3. Giữ nguyên các đường dẫn `backend/`, `frontend/`, `docs/`… Không copy folder `27_11_2026_Loc`, `source`, `manifest.json` hoặc hướng dẫn vào mã ứng dụng.
4. Kiểm tra đúng danh sách `files.txt`, stage và commit bằng tài khoản Git của chính người thực hiện. Mở hai PR của ngày, merge cả hai trước khi chuyển ngày tiếp theo.

## Tạo nhánh trước khi copy

Thay hai đường dẫn mẫu theo máy. Chạy lệnh tạo nhánh **trước khi copy**; chỉ tiếp tục nếu working tree sạch và index không có file từ việc khác.

```powershell
$ErrorActionPreference = 'Stop'
Set-Location 'D:\duong-dan\repo-dich'
$TrangThai = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Không đọc được trạng thái repo đích.' }
if ($TrangThai) { throw 'Repo đích còn thay đổi; xử lý trước khi tạo nhánh.' }
git switch main
if ($LASTEXITCODE -ne 0) { throw 'Không chuyển được về main; dừng.' }
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) { throw 'Không cập nhật được main; dừng.' }
git switch -c work/2026-11-27-loc-fullstack-20
if ($LASTEXITCODE -ne 0) { throw 'Không tạo được nhánh; dừng trước khi copy.' }
```

Sau khi block trên chạy thành công, **copy nội dung `source/` vào gốc repo đích**, rồi chạy block dưới. Giữ bộ workflow bên ngoài repo đích để không làm working tree bị bẩn bởi các folder bàn giao.

## Stage, commit và push sau khi copy

```powershell
$ErrorActionPreference = 'Stop'
$NhanhHienTai = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $NhanhHienTai -ne 'work/2026-11-27-loc-fullstack-20') { throw 'Sai nhánh làm việc; dừng commit.' }
$DanhSach = 'D:\duong-dan\workflow-repo\27_11_2026_Loc\files.txt'
git add -f --pathspec-from-file=$DanhSach
if ($LASTEXITCODE -ne 0) { throw 'Stage chưa đầy đủ; kiểm tra trước khi tiếp tục.' }
git diff --cached --stat
if ($LASTEXITCODE -ne 0) { throw 'Không đọc được staged diff.' }
git diff --cached --name-status
if ($LASTEXITCODE -ne 0) { throw 'Không đọc được danh sách staged.' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Staged diff cần được kiểm tra/sửa trước khi commit.' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'Không có thay đổi mới; không tạo commit rỗng.'
} elseif ($LASTEXITCODE -eq 1) {
    git commit -m "feat(fullstack): ban giao 27/11/2026 - Loc"
    if ($LASTEXITCODE -ne 0) { throw 'Commit thất bại; chưa push.' }
    git push -u origin work/2026-11-27-loc-fullstack-20
    if ($LASTEXITCODE -ne 0) { throw 'Push chưa thành công; kiểm tra kết nối/quyền, không force-push.' }
} else {
    throw 'Không kiểm tra được staged diff; dừng commit.'
}
```

`git add -f` chỉ áp dụng các đường dẫn trong `files.txt` đã kiểm tra, vì repo hiện có rule bỏ qua Markdown và backend/tests. Không dùng `git add .` cho việc bàn giao này. Các lệnh là hướng dẫn để người phụ trách thực hiện; bộ công cụ không tự commit hoặc push.

## Điều kiện kiểm tra

Đây là lát bàn giao từ cùng snapshot, không phải bản triển khai mới trong ngày. Mọi gói đang ở trạng thái chuẩn bị, chưa xác nhận đã push. Cả hai người đều có mã backend và frontend; file cùng tên cơ sở như JSX/CSS/test được giữ thành đơn vị, không ghi đè phần của người còn lại. Các gói riêng có import chéo và chưa bảo đảm khởi chạy độc lập; schema/migration đầy đủ cần cả hai gói ngày 01/12. Không chạy migration hay triển khai trên dữ liệu thật từ một phần source.

Chạy `python -X utf8 workflow-repo/kiem_tra_goi.py` ở thư mục chứa bộ bàn giao để kiểm tra file/hash. Khi đủ source, dùng các bước kiểm thử ở README gốc bộ bàn giao. Gói này chỉ thêm/ghi đè file, không có thao tác xóa; file cũ ngoài danh sách vẫn còn trong repo đích.
