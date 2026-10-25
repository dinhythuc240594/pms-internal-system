# Frontend PMS

Cấu trúc mã nguồn và trách nhiệm các phân hệ: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

Chạy backend theo `backend/README.md`, sau đó tại `frontend` chạy `npm ci` và `npm run dev`. Mở `/id/login`. Vite chuyển `/api` đến `http://127.0.0.1:5000`.

Đăng nhập bằng tài khoản do backend tạo; frontend không có bộ chọn tài khoản hoặc mật khẩu mặc định. Phiên dùng cookie HttpOnly, request gửi `credentials: include`; CSRF chỉ giữ trong bộ nhớ. Chỉ lựa chọn khách sạn được lưu trong localStorage. Các khoản tiền đang chờ xác nhận giữ UUID chống gửi trùng và SHA256 của nội dung trong sessionStorage; không lưu nội dung tiền, hồ sơ khách, mật khẩu hay token. Không có fallback lưu nghiệp vụ trong trình duyệt.

Khi triển khai frontend riêng API, đặt `VITE_API_BASE_URL=https://api.example.com` lúc build. Đây là địa chỉ API công khai, không phải chuỗi kết nối PostgreSQL. Backend phải cho phép origin frontend và cấu hình cookie theo hướng dẫn triển khai.

## Frontend trên Coolify

| Cấu hình | Giá trị |
| --- | --- |
| Build Pack / Site type | Nixpacks / Static |
| Base Directory | `/frontend` |
| Publish Directory | `/dist` |
| Install Command | `npm ci --include=dev` |
| Build Command | `npm run build` |
| Start Command | Để trống; Coolify phục vụ file bằng Nginx |
| Node | `NIXPACKS_NODE_VERSION=22`, phiên bản thực tế tối thiểu 22.12 |
| Watch Paths | `frontend/**` hoặc để trống nếu muốn deploy mỗi commit |

Commit `frontend/package-lock.json` cùng `package.json` để build dùng đúng phiên
bản đã kiểm tra. Sau khi pull thay đổi này, sửa hoặc xóa biến build
`NIXPACKS_INSTALL_CMD` cũ đang xóa lockfile và chạy `npx yarn install
--ignore-engines`; nếu giữ biến, đặt nó bằng `npm ci --include=dev`. Không trộn
Yarn và npm trong cùng pipeline. Các thay đổi trong repo không tự xóa override
đã lưu trên Coolify. Thay Build Command đang là `npx yarn build` bằng
`npm run build`; nếu có biến `NIXPACKS_BUILD_CMD`, sửa tương tự hoặc xóa nó.
Watch Paths tính theo đường dẫn file trong repository;
`src/pages/**` không bao phủ `frontend/src/apps/**` hiện tại.

Giữ SPA fallback `try_files $uri $uri/ /index.html;` trong Nginx. Cấu hình này chỉ
phục vụ frontend: nếu API dùng domain riêng, `VITE_API_BASE_URL` phải bật Build
Variable và trỏ tới backend; nếu dùng cùng domain, cần route `/api` tới backend
ở proxy. Vite proxy local không được mang vào bản static production.

Tham khảo [Coolify Nixpacks](https://coolify.io/docs/applications/builds/nixpacks/deploy),
[Watch Paths](https://coolify.io/docs/applications/deployments/automatic-deployments)
và [biến môi trường](https://coolify.io/docs/applications/configuration/environment-variables).

Kiểm chứng 09/10/2026: đồng bộ lockfile không đổi phiên bản package; cài sạch từ
cache npm trên Windows mất khoảng 9.6 giây, lệnh build khoảng 1.4 giây. Đây không
phải số đo thời gian deploy trên VPS. Log Coolify được cung cấp dừng ở tải
`nginx:alpine`, chưa có debug log đủ để xác định nguyên nhân lần deploy 54 phút.

## Các luồng đã nối máy chủ

- Đặt phòng nhiều phòng và nhiều khách; kiểm tra khả dụng và báo giá từng đêm từ API. Giá chốt được giữ trên booking.
- Check-in, hủy, no-show và check-out; chỉ được trả phòng khi số dư bằng 0. Check-in kiểm tra mọi phòng sạch, hoạt động và không còn khách ở lượt trước, kể cả khách quá hạn. Check-out đánh dấu toàn bộ phòng trong booking là bẩn và tạo task dọn.
- Chi tiết booking có khách, dịch vụ/phụ thu, giá từng đêm, thanh toán/hoàn tiền, ghi chú và lịch sử. Kế toán được ghi thanh toán, hoàn tiền và phụ thu theo quyền máy chủ.
- Phòng, Tape Chart, dashboard và công suất tính mọi phòng của booking nhiều phòng. Phòng/loại phòng đã ngưng hoạt động không được chọn mới.
- Settings: loại phòng/phòng vật lý, dịch vụ/nhóm, nguồn đặt phòng, bữa ăn, loại giường, đơn vị, phương thức thanh toán/quỹ và cấu hình khách sạn.
- Người dùng khách sạn: tạo hoặc gán tài khoản, vai trò và trạng thái membership. Tài khoản đã có chỉ sửa quyền tại khách sạn; frontend không sửa danh tính toàn hệ thống.
- Hồ sơ khách được tạo/sửa trong booking; giá từng đêm, stop sell, khóa phòng theo khoảng ngày và MatrixRate dùng dữ liệu API. Không có API quản lý khách độc lập.
- Quản trị: danh sách khách sạn, tạo khách sạn cùng chủ và tạm ngưng/mở lại. Hồ sơ quản trị đọc tài khoản thật, đổi mật khẩu dùng API.
- Thu chi, phiếu thu/chi/chuyển quỹ và POS dùng API, ledger và chứng từ đối ứng; khoản thu/hoàn booking chống ghi trùng bằng Idempotency-Key.
- Buồng phòng có nhân viên, ca, lập kế hoạch, phân công và kiểm tra. Nhân viên gửi inspection; lễ tân/chủ duyệt completed để phòng sạch. Sửa lịch/phòng hoặc hủy booking vô hiệu task liên quan trong cùng transaction, kể cả booking OTA.
- Giá nâng cao, voucher/khuyến mãi, tỷ giá, kho, hoa hồng, báo cáo cơ bản/chuyên sâu, hồ sơ và thông báo có module API. Giao diện áp dụng quyền và feature do backend trả về.
- OTA/Channex có cấu hình, mapping, lịch sử và job đồng bộ. Webhook xếp job; worker import revision rồi ACK sau commit. Kiểm thử local dùng provider giả lập.

Quyền dựa vào vai trò, membership, gói, quota và feature được backend kiểm tra. Khách sạn tạm ngưng chặn ghi. Tenant đổi sẽ xóa form và loại bỏ kết quả request của tenant cũ. Workspace có nút tải lại; không tự polling nền.

## Giới hạn hiện tại

Thuê giờ, số người lớn/trẻ em/em bé, FOC và bữa sáng trên booking chưa có nghiệp vụ hoàn chỉnh; điều khiển tương ứng bị tắt. Chưa có 2FA, payment gateway, email xác nhận tự động hoặc hóa đơn thuế/ký số. Thanh toán và hoàn tiền hiện là ghi nhận thủ công vào quỹ.

Giá và tiền trên booking dùng tiền tệ/tỷ giá đã chốt. Ledger và báo cáo phân biệt tiền gốc với tiền cơ sở theo snapshot; không cộng lẫn tiền tệ.

Dashboard/báo cáo phân biệt doanh thu phòng dự kiến, đêm đã phục vụ, doanh thu hóa đơn đã chốt và thực thu từ ledger. Chưa có Night Audit, XLSX/PDF tự động, hệ thống lưu snapshot báo cáo hay xử lý issue đối soát. CSV xuất các dòng đang hiển thị.

## Kiểm tra

`npm test`, `npm run lint`, `npm run build`. Các test API kiểm tra cookie/CSRF, lỗi 403, tenant scope, quyền không phụ thuộc gói và chống gửi trùng qua reload. Test model kiểm tra mọi phòng của booking, maintenance và khoảng ngày liền kề. Các test workspace cũ chỉ kiểm tra fixture demo, không được provider runtime sử dụng.

Kiểm thử 9 luồng, thay đổi và giới hạn nghiệm thu: [báo cáo PMS-01–09](../docs/reports/reviews/pms-nine-workflows-2026-10-25.md). Backend integration suite dùng database PostgreSQL `pms_test_<uuid>` được tạo/xóa riêng; không dùng dữ liệu nghiệp vụ. Cây demo cũ không còn được import đã được xóa; fixture workspace còn dùng trong test được giữ lại.
