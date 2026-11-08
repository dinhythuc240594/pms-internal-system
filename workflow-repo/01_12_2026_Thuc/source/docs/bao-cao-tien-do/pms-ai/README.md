# Bộ nội dung báo cáo tiến độ tiểu luận chuyên ngành

**Đề tài:** Xây dựng hệ thống phần mềm quản lý khách sạn kết hợp AI trong quản lý và vận hành.

Ngày lập: **08/11/2026**. Phiên bản: **Dự thảo v1.0**.

| Nội dung | Bản Word | Bản chỉnh sửa Markdown |
| --- | --- | --- |
| 1. Mục tiêu đề tài | [Tải bản Word](01_Muc_tieu_de_tai_PMS_AI.docx) | [Xem nội dung](01_Muc_tieu_de_tai_PMS_AI.md) |
| 2. Phạm vi đề tài | [Tải bản Word](02_Pham_vi_de_tai_PMS_AI.docx) | [Xem nội dung](02_Pham_vi_de_tai_PMS_AI.md) |
| 3. Tài liệu SRS | [Tải bản Word](03_Tai_lieu_SRS_PMS_AI.docx) | [Xem nội dung](03_Tai_lieu_SRS_PMS_AI.md) |

Bố cục mục tiêu và phạm vi tham khảo hai mẫu Word trong thư mục cha; SRS bám tám chương của mẫu `TAI_LIEU_SRS_v1.1.docx`. Nội dung được viết lại cho PMS, gồm yêu cầu chức năng/phi chức năng, phân quyền, use case, mô hình xử lý, ba sơ đồ, ma trận truy vết và kế hoạch kiểm chứng. Các nguồn nội bộ được ghi trong từng tài liệu.

Các thông tin cần điền trước khi nộp: tên trường, khoa, sinh viên/nhóm, mã số sinh viên và giảng viên hướng dẫn. Không sử dụng thông tin cá nhân trên bìa của tài liệu mẫu.

## Cách hiểu trạng thái tiến độ

- **PMS kế thừa:** đã có mã nguồn cho nhiều nghiệp vụ; cần kiểm chứng theo phiên bản và môi trường demo được chọn. Nội dung tài liệu không xác nhận nghiệm thu mới.
- **AI dự kiến:** trợ lý tiếng Việt tra cứu số liệu tổng hợp và tóm tắt vận hành theo quyền. Chưa có bằng chứng triển khai AI trong phần mã và tài liệu được đối chiếu; đây là phạm vi đề xuất cho tiểu luận.
- **OTA:** có mã kết nối Channex; bằng chứng giả lập, sandbox và vận hành thực tế phải phân biệt rõ. Lần biên soạn này không gọi OTA thật.
- **Chỉ tiêu chất lượng:** là mục tiêu đánh giá, chưa phải kết quả đo. Bảng kiểm thử SRS có 30 kịch bản ở trạng thái Not Tested; bộ đánh giá AI đề xuất gồm 60 tình huống, chưa thực thi.

## Cập nhật tài liệu

Chỉnh nội dung ở ba file Markdown, sau đó chạy từ thư mục gốc repository:

```powershell
python -X utf8 docs/bao-cao-tien-do/pms-ai/xuat_word.py
```

Script dùng thư viện chuẩn Python để tạo lại ba file Word, giữ các sơ đồ PNG trong `assets/`. Thông tin bìa Word được cấu hình trong hàm `cover` của script; khi điền thông tin chính thức, cập nhật cả bìa này và phần thông tin ở Markdown. Script nguồn vẽ sơ đồ nằm tại `assets/tao_so_do.ps1`.

Các file mẫu và mã ứng dụng được giữ nguyên. Đã kiểm tra cấu trúc gói Word, XML, ảnh nhúng, liên kết nguồn và nội dung giữa các bản; chưa kiểm tra phân trang bằng Microsoft Word hoặc LibreOffice trên máy người nộp.
