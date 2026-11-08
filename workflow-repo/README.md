# Bộ workflow bàn giao source lên GitHub

**Thời gian:** 08/11/2026 đến 01/12/2026, gồm 24 ngày liên tục.  
**Người phụ trách:** Thuc và Loc; **cả hai đều làm backend + frontend song song mỗi ngày**.  
**Số gói:** 48 folder theo mẫu `ngày_tháng_năm_ngườipush`.

## Mở gói cần làm

- [Lịch theo ngày](LICH_PUSH.md): mở hướng dẫn của từng người.
- [Lịch CSV](LICH_PUSH.csv): mở bằng Excel để theo dõi, lọc theo ngày/người.
- [Phân công và tên nhánh](plan.json): chủ đề backend/frontend, số file, phụ thuộc và trạng thái.
- [Snapshot nguồn](snapshot.json): commit nền, SHA-256 và phạm vi file được đóng gói.

Ví dụ:

```text
workflow-repo/
  08_11_2026_Thuc/
    HUONG_DAN.md        # công việc, nhánh, lệnh commit/push
    manifest.json      # danh sách file, kích thước, SHA-256
    files.txt          # danh sách đường dẫn để stage chính xác
    source/
      backend/...
      frontend/...
  08_11_2026_Loc/
    source/
      backend/...
      frontend/...
  ...
  01_12_2026_Thuc/
  01_12_2026_Loc/
```

## Cách copy/paste để commit

1. Người phụ trách mở folder đúng ngày và tên của mình, đọc `HUONG_DAN.md`.
   Giữ bộ `workflow-repo` bên ngoài repo đích; nó là thư mục cung cấp file để copy. Nếu dùng repo hiện tại làm repo đích, sao chép bộ bàn giao ra một thư mục khác trước và giữ working tree sạch.
2. Trong repo đích, bảo đảm không còn thay đổi/index từ việc khác. Đồng bộ `main` có đủ cả hai gói của ngày trước, rồi tạo nhánh được ghi trong hướng dẫn. Với repo GitHub mới, cần có `main` và remote `origin` trước khi dùng các lệnh mẫu.
3. Mở `source/`, chọn **toàn bộ nội dung bên trong**, copy vào **gốc repo đích**. Giữ nguyên cây thư mục. Khi Windows hỏi, chọn thay thế file đã tồn tại; file mới sẽ được thêm.
4. Không copy folder ngày, folder `source/`, `manifest.json` hoặc toàn bộ `workflow-repo/` vào ứng dụng. Không thay cả folder `backend`/`frontend` bằng thao tác xóa; chỉ ghép nội dung và thay file trùng.
5. Dùng `files.txt` của gói để stage, kiểm tra diff, commit và push nhánh. Lệnh cụ thể nằm trong `HUONG_DAN.md`; dùng tài khoản Git của người thực sự thực hiện.
6. Mở PR về `main`. Hai nhánh cùng ngày không trùng đường dẫn nên có thể làm song song từ cùng mốc. Merge cả hai, cập nhật `main` trên máy hai người, rồi chuyển ngày tiếp theo.

Tên nhánh ví dụ: `work/2026-11-08-thuc-fullstack-01` và `work/2026-11-08-loc-fullstack-01`. Bộ bàn giao chưa tạo nhánh, commit, PR hoặc push lên GitHub. Ngày trên folder là ngày phân công; Git ghi ngày và tác giả thực tế khi người phụ trách commit, không sửa ngày commit để khớp lịch.

## Cách chia trách nhiệm

Mỗi ngày có một nhóm công việc backend và một nhóm công việc frontend. Cả Thuc và Loc nhận các file cụ thể trong hai nhóm đó. Tên cơ sở trùng nhau trong cùng folder, chẳng hạn `BookingModal.jsx`, `BookingModal.css`, `BookingModal.test.js`, được giữ thành một đơn vị. Mỗi người có ít nhất một đơn vị mã Python backend và một đơn vị JavaScript/JSX frontend thực, không chỉ nhận tài liệu hoặc test.

Sau khi bảo đảm hai phần mã thực, các đơn vị còn lại được phân bổ theo dung lượng để giảm chênh lệch. Đây là cách phân chia file của snapshot hiện có; dung lượng không đại diện cho thời gian hay độ khó. `files.txt` và `manifest.json` là ranh giới trách nhiệm chính xác. Một đường dẫn chỉ thuộc một gói trên toàn lịch. Nếu hai người cần sửa cùng file ngoài phần đã giao, thống nhất lại manifest trước khi copy để tránh ghi đè thay đổi mới.

## Điều kiện sử dụng các gói

Bộ này chia **mã nguồn đã có tại thời điểm tạo**, không tạo ra các phiên bản phát triển mới cho từng ngày. Toàn bộ gói ở trạng thái `prepared_not_pushed`. Nếu repo đích đã chứa đúng source này, copy lại có thể không tạo diff; khi đó không tạo commit rỗng. Muốn có các thay đổi phát triển mới cần thực hiện công việc mới trên nhánh thật rồi cập nhật gói tương ứng.

Các gói có import chéo; backend app factory, frontend router và migration phụ thuộc nhiều module. Một gói hoặc một ngày chưa bảo đảm ứng dụng chạy được. Đây là lịch bàn giao/ghép source; chỉ kiểm tra bản tích lũy sau khi có đủ phụ thuộc. Migrations và công cụ tổng hợp nằm ở hai gói cuối ngày 01/12; không chạy migration trên database thật từ source đang ghép dở.

Copy-only chỉ **thêm hoặc ghi đè**, không xóa file đã lỗi thời trong repo đích. Bộ hiện tại không có danh sách xóa/đổi tên vì được lấy từ trạng thái source đang tồn tại, không từ diff với một repo đích xác định. Nếu có thay đổi loại này về sau, cần lập danh sách riêng trước khi bàn giao.

## Phạm vi source

Đóng gói mã ứng dụng backend/frontend, test đã được Git theo dõi, migration, công cụ chạy/kiểm thử, cấu hình mẫu và tài liệu dự án được chọn. Bộ tài liệu PMS–AI vừa tạo cũng được đưa vào lần bàn giao cuối. Các file nguồn giữ nguyên byte, không sửa logic và không thêm AI chưa triển khai.

Không đóng gói `.git`, chính bộ `workflow-repo`, `.env` thật, thư viện cài sẵn, build, cache, log, database, khóa riêng, snapshot trình duyệt `.playwright-cli`, kết quả phân tích tự sinh hoặc các mẫu báo cáo lớn không phải source ứng dụng. `.env.example` được giữ làm mẫu cấu hình, không dùng để kết nối dịch vụ thật.

Repo hiện có rule `.gitignore` bỏ qua Markdown và `/backend/tests`. Vì vậy các hướng dẫn dùng `git add -f --pathspec-from-file=...` với **đúng danh sách file đã kiểm tra**; không dùng `git add .` hoặc force-add cả repo. Lưu ý `files.txt` nằm ngoài repo đích vẫn có thể được truyền bằng đường dẫn tuyệt đối.

## Kiểm tra và cập nhật

Tại thư mục gốc chứa bộ bàn giao:

```powershell
python -X utf8 workflow-repo/kiem_tra_goi.py
```

Trình kiểm tra xác minh đủ 48 gói/24 ngày, cả hai phần backend/frontend của mỗi người, đường dẫn không trùng, file/hash/kích thước khớp snapshot, phụ thuộc ngày trước và không có đường dẫn riêng tư/runtime. Sau đó ghép source trong thư mục tạm để kiểm tra thêm file mới và ghi đè file cũ. Nó không sửa source ứng dụng, commit, push hoặc gọi OTA.

Sau khi ghép đủ code vào repo đích, làm theo `backend/README.md` và `frontend/README.md` để cài môi trường, rồi chạy kiểm tra phù hợp. Backend integration tests cần PostgreSQL/database test riêng. Các bước thường dùng ở frontend là `npm test`, `npm run lint`, `npm run build`; chỉ ghi đạt khi thực sự chạy trên bản đã ghép. Kiểm tra gói/hash không thay thế kiểm thử ứng dụng.

Script `tao_goi.py` có thể tạo lại các gói từ source hiện tại. Khi thay đổi source, cần cập nhật/rà soát manifest và phát hành lại gói có liên quan. Script từ chối tự xóa file dư ngoài danh sách; không dùng nó như công cụ đồng bộ xóa. Không chạy lại trong lúc một người đang chỉnh trực tiếp các bản sao bàn giao.
