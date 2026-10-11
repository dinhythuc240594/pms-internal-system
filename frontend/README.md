# Frontend PMS — API BE01–05

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
- Check-in, hủy và check-out; chỉ được trả phòng khi số dư bằng 0. Check-out đánh dấu toàn bộ phòng trong booking là bẩn.
- Chi tiết booking có khách, dịch vụ/phụ thu, giá từng đêm, thanh toán/hoàn tiền, ghi chú và lịch sử. Kế toán được ghi thanh toán, hoàn tiền và phụ thu theo quyền máy chủ.
- Phòng, Tape Chart, dashboard và công suất tính mọi phòng của booking nhiều phòng. Phòng/loại phòng đã ngưng hoạt động không được chọn mới.
- Settings: loại phòng/phòng vật lý, dịch vụ/nhóm, nguồn đặt phòng, bữa ăn, loại giường, đơn vị, phương thức thanh toán/quỹ và cấu hình khách sạn.
- Người dùng khách sạn: tạo hoặc gán tài khoản, vai trò và trạng thái membership. Tài khoản đã có chỉ sửa quyền tại khách sạn; frontend không sửa danh tính toàn hệ thống.
- Hồ sơ khách CRUD; giá từng đêm, stop sell, khóa phòng theo khoảng ngày và MatrixRate dùng dữ liệu API.
- Quản trị: danh sách khách sạn, tạo khách sạn cùng chủ và tạm ngưng/mở lại. Hồ sơ quản trị đọc tài khoản thật, đổi mật khẩu dùng API.
- Thu chi đọc ledger thanh toán/hoàn tiền từ booking. Đây chưa phải sổ quỹ nâng cao BE06; số dư đầu kỳ, rút/chuyển quỹ và phiếu thu/chi riêng đang tắt.

Quyền dựa vào vai trò và membership. Gói thương mại, quota và feature gating BE09 chưa triển khai; không khởi tạo gói Trial/Basic/Pro trong provider. Khách sạn tạm ngưng vẫn cho đọc theo API nhưng chặn ghi. Tenant đổi sẽ xóa form và loại bỏ kết quả request của tenant cũ.

## Giới hạn hiện tại

Giữ giao diện các màn hình chưa có backend để xem cấu trúc, nhưng các thao tác ghi bị tắt và có thông báo: POS, kho/mua hàng, OTA, voucher/khuyến mãi, kế hoạch/nhân sự buồng phòng, billing/feature thương mại, người dùng nội bộ toàn hệ thống và bảo mật nâng cao/2FA. Giờ theo booking, số người lớn/trẻ em/em bé và FOC chưa có schema; các điều khiển hiển thị nhưng không chỉnh sửa.

Giá và tiền trên booking dùng tiền tệ đã chốt; ledger và báo cáo doanh thu có bộ lọc tiền tệ để tránh cộng lẫn các loại tiền. Không triển khai quy đổi ngoại tệ.

Biểu đồ và danh sách minh họa còn lại phía dưới dashboard được đánh dấu xem trước. Báo cáo doanh thu hiện là doanh thu phòng dự kiến theo nightly snapshot, chưa là báo cáo kế toán hợp nhất.

## Kiểm tra

`npm test`, `npm run lint`, `npm run build`. Các test API kiểm tra cookie/CSRF, lỗi 403, tenant scope, quyền không phụ thuộc gói và chống gửi trùng qua reload. Test model kiểm tra mọi phòng của booking, maintenance và khoảng ngày liền kề. Các test workspace cũ chỉ kiểm tra fixture demo, không được provider runtime sử dụng.

Kiểm tra tích hợp local: tạo hai phòng/hai khách → cọc → check-in → phụ thu → chặn trả phòng khi còn nợ → thanh toán đủ → check-out → phòng bẩn → reload; chuyển tenant để kiểm tra cách ly dữ liệu. Dữ liệu kiểm tra thuộc PostgreSQL local.
