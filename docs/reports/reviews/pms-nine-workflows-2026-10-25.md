# Rà soát và kiểm thử 9 luồng PMS

Ngày: **25/10/2026**. Tài liệu đối chiếu:
[PMS_9luong_UseCase_Activity_Sequence_Class.drawio.xml](../../PMS_9luong_UseCase_Activity_Sequence_Class.drawio.xml).

## Phạm vi và cách kiểm tra

- Kiểm kê, phân tích AST/import và lint toàn bộ mã ứng dụng: 125 file Python trong
  `backend/pms_api` và `backend/common`; 236 file JS/JSX/CSS/JSON/SVG trong
  `frontend/src` trước chỉnh sửa. Đọc chi tiết các handler, domain, model, worker,
  provider và màn hình tham gia 9 luồng; đối chiếu test và hợp đồng API.
- Xác định code thừa bằng đồ thị import từ `frontend/src/main.jsx` và từ mọi file
  test; xác nhận lại bằng production build. Không xóa fixture còn được test dùng.
- Test tích hợp chạy Flask API, transaction, migration và RLS thật trên PostgreSQL
  riêng. `run_domain_tests.py` tạo database `pms_test_<uuid>` mới và xóa đúng database
  đó khi kết thúc; không chạy suite trên database nghiệp vụ.
- Provider Channex được giả lập tại transport. Không dùng giao dịch tiền, webhook
  hay tài khoản nhà cung cấp thật để kiểm thử.

## Các lỗi và thay đổi

| Vấn đề | Hành vi sau sửa |
| --- | --- |
| Phòng sạch nhưng khách cũ chưa checkout có thể được check-in cho booking liền kề | Khóa mọi phòng của booking, kiểm tra các booking `IN_HOUSE` khác không phụ thuộc ngày trả dự kiến; trả `409 room_occupied`. UI cũng chặn sớm và giải thích lý do. |
| Sửa ngày/phòng hoặc hủy booking để lại task buồng phòng cũ | Hủy task mở của đúng booking trong transaction sửa/hủy. Contact-only edit giữ nguyên task; lỗi sửa rollback toàn bộ thay đổi. |
| Chuyển phòng đi rồi quay lại có thể không tạo được task vì trùng khóa kế hoạch cũ | Giữ task đã hủy và lịch sử, giải phóng khóa lập kế hoạch của intent bị thay thế; tạo task mới khi lập lại, chạy lặp không trùng. |
| OTA sửa/hủy booking chưa đồng bộ task buồng phòng | Dùng chung logic hủy task và thứ tự khóa phòng/tồn. Chỉ ACK sau khi import, receipt và job ACK đã commit. |
| Revision OTA chỉ đổi thông tin khách có thể tự chuyển phòng khi phòng khác vừa trống | Ưu tiên giữ phòng đã phân nếu vẫn hợp lệ; chỉ đổi khi lịch hoặc khả dụng yêu cầu. |
| `type` của charge là JSON list/object gây lỗi máy chủ | Kiểm tra kiểu trước khi kiểm tra tập giá trị; trả 422 và không phát sinh charge. |
| Ngày rút gọn/ISO week được chấp nhận ngoài hợp đồng API | Chỉ nhận ngày lịch `YYYY-MM-DD`; giữ khoảng `[checkIn, checkOut)`, 1–366 đêm. |
| Backend không import được trên Python 3.13 của máy | Dùng tuple exception có ngoặc; giữ hành vi trên 3.14, đặt Ruff target 3.13. Không đổi dependency production. |
| Test báo cáo tỷ giá còn đòi câu mô tả tiếng Việt sau khi API chuyển sang i18n | Kiểm tra đúng khóa `i18n:reports.definitions.moneyBasisBase`; giữ nguyên toàn bộ assertion số tiền, tỷ giá, ADR và công nợ. Nhóm này chạy lại đạt. |

Các thay đổi nghiệp vụ nằm tại `bookings/application.py`, `bookings/domain.py`,
`housekeeping/application.py`, `channels/importer.py` và phần check-in frontend.
Không đổi schema, lịch sử migration, URL hoặc cấu trúc response.

## Code đã xóa

**26 file**, gồm:

- 22 file của cây demo độc lập: `frontend/src/App.jsx`, các file trong
  `frontend/src/pages`, `frontend/src/components`, `frontend/src/mockData`.
  Ứng dụng thực dùng `src/main.jsx` → `src/app/App.jsx`, không import cây này.
- `frontend/src/apps/pms/rooms/pages/Guests.jsx`: trang không có route/import,
  gọi chức năng lưu khách độc lập không có API. Hồ sơ khách tiếp tục được quản lý
  qua booking và `BookingTabs`.
- Hai asset mặc định không còn dùng: `src/assets/react.svg`, `src/assets/vite.svg`.
- `backend/patch.py`: script thay chuỗi vào cấu trúc route cũ, không thuộc runtime,
  migration hoặc test và không còn phù hợp sau khi tách application.

Đồng thời bỏ import `LegacyOverlay` không dùng trong Settings. Sau thay đổi,
kiểm kê còn 213 file frontend, không còn JS/JSX không được tham chiếu từ entry
point hoặc test theo phân tích import tĩnh. Fixture `data/workspace.js` và
`apps/manager/mockData.js` vẫn còn vì bộ test hiện hữu sử dụng chúng.

## Đối chiếu chức năng và test case

Các scenario mới nằm tại
[`backend/tests/test_pms_workflows.py`](../../../backend/tests/test_pms_workflows.py),
bổ sung cho các bộ test nghiệp vụ có sẵn.

| Luồng XML | Scenario đã đối chiếu | Kiểm thử liên quan |
| --- | --- | --- |
| PMS-01 Đặt phòng | Quote không giữ chỗ; tạo `CONFIRMED` nhiều phòng chốt giá đêm và giữ tồn; từ chối đặt trùng/stop sell/khóa phòng; cọc là thao tác sau khi tạo | `test_pms01_*`; `test_booking_integration.py`; `test_catalog_postgres.py`; `test_pricing_integration.py` |
| PMS-02 Sửa/hủy | Sửa contact giữ giá/task; đổi phòng/ngày cập nhật tồn/task; sửa thất bại rollback; hủy giữ cọc/lịch sử và trả tồn; chuyển đi/quay lại lập được task mới | `test_pms02_*`; `test_booking_client_acceptance.py`; `test_booking_no_show.py` |
| PMS-03 Check-in | Kiểm tra mọi phòng; ngày khách sạn; phòng bẩn/ngưng hoạt động; khách cũ quá hạn chưa rời; không mở lại booking đã đóng | `test_pms03_*`; `bookingLifecycle.test.js`; `test_booking_integration.py` |
| PMS-04 Buồng phòng | Phân công đúng người; `pending → in_progress → inspection → completed`; housekeeper không tự duyệt sạch; revision cũ bị chặn | `test_pms04_*`; `test_housekeeping_integration.py`; các bộ `test_housekeeping_*` |
| PMS-05 Dịch vụ | Charge làm tăng đúng số dư; loại/danh mục/số tiền sai bị từ chối; idempotency và rollback; không tạo dòng sổ quỹ khi chỉ ghi phí | `test_pms05_*`; `test_booking_integration.py`; `test_finance_integration.py` |
| PMS-06 Check-out | Còn nợ bị chặn; thanh toán đủ mới checkout; mọi phòng bẩn và tạo đúng task; không checkout hai lần; giữ giá đêm | `test_pms06_*`; `test_booking_integration.py`; `test_closed_finance.py` |
| PMS-07 Thanh toán | Cọc, replay cùng key/body, đổi body bị chặn; hủy rồi hoàn; ledger có đúng hai dòng đối ứng; hạn mức thu/hoàn và số dư quỹ | `test_pms07_*`; `test_booking_integration.py`; `test_finance_integration.py` |
| PMS-08 OTA/Channex | Xác thực webhook; revision trùng/cũ; import/ACK sau commit; lỗi/rollback/retry; thay đổi booking và task; giữ phòng khi chỉ cập nhật khách | `test_pms08_*`; `test_channels_integration.py`; `test_channel_mapping_lifecycle.py`; `test_channel_pacing.py` |
| PMS-09 Báo cáo | Booking hủy không vào dự kiến nhưng tiền đã thu vẫn trong ledger; lọc kỳ/tiền tệ/cơ sở; quyền/tenant; dashboard và báo cáo chuyên sâu | `test_pms09_*`; `test_reports_acceptance.py`; `test_reports_financial.py`; `test_reports_business.py`; `csv.test.js` |

Thêm một unit test backend kiểm tra ngày sai định dạng và bốn test frontend cho
điều kiện check-in. Script chạy integration nhận thêm tham số unittest để chạy
scenario riêng mà vẫn tạo/xóa database tạm an toàn.

## Chỉnh sửa sơ đồ nghiệp vụ

Giữ 9 trang, ID các phần tử và bố cục người dùng đã chỉnh. Sửa nhãn, một số vị trí
ở luồng đặt phòng và các cạnh điều khiển; thêm ghi chú nghiệp vụ phía dưới mỗi
trang. Đã parse XML, kiểm tra ID trùng và tham chiếu source/target/parent.

- Tác nhân thao tác PMS nội bộ là lễ tân/chủ hoặc nhân viên có quyền; khách đưa
  yêu cầu qua nhân viên. Xác nhận booking hiện là phản hồi UI, chưa tự gửi email.
- Lưu booking/giữ tồn trước khi ghi cọc qua PMS-07. Hết phòng quay lại chọn
  ngày/phòng; từ chối sửa hoặc check-in không đi sang nhánh thành công.
- Phòng chưa sẵn sàng phải xử lý và kiểm tra lại. Bảo trì không tự đi sang clean;
  kiểm tra không đạt quay lại dọn. Ghi rõ người có quyền duyệt sạch.
- Thanh toán hiện là ghi nhận thủ công vào quỹ, không mô tả một payment gateway
  đã hoạt động. Charge khác dòng tiền; checkout kiểm tra lại số dư bằng 0.
- Tách webhook nhận/xếp job, import revision và ACK sau commit. Đối chiếu class
  với entity thật; đánh dấu rõ service/projection không phải bảng lưu dữ liệu.
- Báo cáo ghi đúng khả năng hiện có: JSON/CSV, công suất, ADR, doanh thu và dòng
  tiền. Không mô tả RevPAR riêng, XLSX/PDF hoặc quản lý issue đối soát đã hoàn tất.

## Kết quả xác minh

Bộ backend đầy đủ chạy **600 test, không bỏ qua test nào**: 599 đạt, một test
dừng ở assertion câu mô tả tiếng Việt cũ. API hiện trả khóa i18n và dữ liệu tính
tiền trước assertion đó đều đúng. Sau khi cập nhật assertion theo định dạng API
hiện có, chạy lại cả nhóm báo cáo tỷ giá: **2/2 đạt**, bao gồm phần kiểm tra còn
lại của test đó. Không thay đổi logic ứng dụng sau lượt 600 test; không cộng hai
test chạy lại vào số test duy nhất. Không chạy lại toàn bộ 600 test lần thứ hai.

Môi trường: Python 3.13.2, PostgreSQL 17.6, Node 24.16.0. Binary PostgreSQL dùng
cho lượt này nằm trong `.tools/pg-test/pgsql/bin`; trên máy khác cấu hình `PG_BIN`
theo [hướng dẫn backend](../../../backend/README.md).

| Kiểm tra | Kết quả hiện tại |
| --- | --- |
| Backend đầy đủ trên PostgreSQL | 600 test / 653,837 giây; 599 đạt, 1 assertion i18n cũ được sửa như mô tả trên |
| Nhóm báo cáo tỷ giá sau sửa assertion | 2/2 đạt; không còn lỗi chưa xử lý từ lượt đầy đủ |
| Scenario mới theo 9 luồng XML | 15/15 đạt trong lượt đầy đủ |
| Frontend `npm test` | 166/166 đạt |
| Frontend lint | Exit 0; còn 31 cảnh báo React/hooks có sẵn |
| Production build | Đạt với dependency đúng lockfile |
| i18n audit | 3.205 chuỗi đã có bản dịch; thiếu 0 |
| Backend Ruff | Đạt trên `pms_api common tests scripts` |
| Backend compileall | Đạt trên mã ứng dụng, common, scripts, tests |
| XML | 9 trang parse được; ID và tham chiếu hợp lệ |

## Chạy lại

Từ `backend`, khởi động cluster local riêng rồi chạy test:

```powershell
# Đường dẫn binary đã chuẩn bị ở máy kiểm thử; máy khác đặt PG_BIN tương ứng.
$env:PG_BIN = (Resolve-Path ..\.tools\pg-test\pgsql\bin).Path
.\.venv\Scripts\python.exe scripts/local_postgres.py start
.\.venv\Scripts\python.exe -m ruff check pms_api common tests scripts
.\.venv\Scripts\python.exe scripts/run_domain_tests.py
# Chỉ kiểm tra scenario của 9 luồng:
.\.venv\Scripts\python.exe scripts/run_domain_tests.py discover -s tests -p test_pms_workflows.py -v
```

Từ `frontend`:

```powershell
npm ci --include=dev --ignore-scripts
npm test
npm run lint
npm run i18n:audit
npm run build
```

## Giới hạn nghiệm thu

Chưa thực hiện thao tác browser E2E, nghiệm thu Channex staging/production, gửi
email, chuyển tiền hoặc triển khai Coolify. Chưa có payment gateway, tự động tính
phí hủy/thuế/thuê giờ/FOC, Night Audit, hóa đơn thuế/ký số hay xuất XLSX/PDF tự
động. Các chức năng này được ghi rõ trong sơ đồ thay vì xem là đã hoàn thành.
31 cảnh báo React/hooks còn lại cần đợt kiểm tra giao diện riêng; lint exit 0
không đồng nghĩa không còn cảnh báo hoặc mọi lỗi tiềm ẩn đã được loại bỏ.
