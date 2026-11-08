# Kiến trúc backend và ánh xạ design pattern

Cập nhật refactor: 03/11/2026. Mục tiêu là tạo ranh giới rõ ràng giữa HTTP, điều phối
nghiệp vụ, quy tắc thuần và tích hợp, đồng thời giữ hợp đồng API và transaction cũ.

## Cấu trúc và chiều phụ thuộc

```mermaid
flowchart LR
    HTTP[urls.py / HTTP views] --> APP[application.py / service.py]
    CLI[CLI / workers] --> APP
    APP --> DOMAIN[domain.py / strategies / workflow]
    APP --> PORT[Protocol / runtime port]
    FLASK[FlaskRuntime adapter] -. implements .-> PORT
    REPO[SQLAlchemy repositories] -. implements .-> PORT
    CHANNEX[ChannexClient adapter] -. implements .-> PORT
    ROOT[composition.py] --> FLASK
    ROOT --> REPO
    ROOT --> CHANNEX
```

- `urls.py` và các file `*_urls.py`: giữ URL, endpoint, HTTP methods, đăng ký lazy.
- `routes.py`: giữ class view và decorator phân quyền; gọi application tương ứng.
  Các module HTTP riêng của Manager/Channex, hoa hồng, notifications, workspace
  và health cũng dùng cùng cách tách qua file `*_application.py`. Các entry point
  mới của stay changes, OTA exceptions/history/preview, reconciliation và night
  audit tuân theo cùng ranh giới này.
- `application.py`: điều phối use case, validation có dữ liệu, snapshot, audit,
  kết quả trả về. Không import Flask trực tiếp và không gọi chéo HTTP handler.
- `domain.py`: các quy tắc thuần đã tách cho booking, catalog, finance, inventory,
  housekeeping, pricing và booking OTA; không truy cập database hoặc HTTP.
- `ports.py`: hợp đồng context, reservation persistence, pricing persistence và
  channel integration. `use_runtime()` cho phép inject implementation trong test
  hoặc entry point khác, có phục hồi context khi gặp lỗi.
- `adapters/flask_runtime.py`: nối context và JSON response của Flask với port.
  Adapter dùng context hiện hành; không sao chép actor, tenant hoặc cache quyền.
- `composition.py`: cấu hình dịch vụ riêng cho từng Flask app trong
  `app.extensions["pms_services"]`; đăng ký subscriber và repository.

Các helper còn được truy cập qua module route cũ bằng `__getattr__` để giữ tương
thích import. Code backend mới nên import từ application hoặc domain. Khi mock,
patch module sở hữu hàm sau khi tách, thay vì patch tên được chuyển tiếp bởi route.

## Đối chiếu với hình thiết kế

| Pattern | Triển khai | Hành vi được giữ |
| --- | --- | --- |
| Hexagonal Architecture | Domain thuần; context/repository/channel ports; Flask adapter và composition root | Context tenant/actor và response HTTP vẫn dùng cùng nguồn cũ |
| Repository | `bookings/repository.py`, `pricing/repository.py`, `channels/repository.py` | Predicate tenant, thứ tự truy vấn, row lock và session hiện hành |
| Service Layer | 28 module application cho các module HTTP; service worker riêng | 175 thân hàm handler hiện hành được chuyển sang application |
| Adapter | `channels/client.py` triển khai các thao tác trong `channels/ports.py` | URL cố định, timeout, phân loại lỗi và payload Channex |
| Strategy | `pricing/strategies.py`; `channels/policies.py` | Phần trăm/stay-pay, quy tắc làm tròn, đóng bán và tồn âm |
| Factory | `channels/factory.py`; wiring trong `composition.py` | Hotel, Manager và worker tạo Channex client qua cùng điểm cấu hình |
| Observer / Event | `events.py`; audit phát tới notification rồi channel queue | Subscriber đồng bộ, cùng transaction, giữ thứ tự và truyền lỗi lên caller |
| Transactional workflow | `channels/workflows.py` và durable ACK job hiện có | Import booking và receipt trước, ACK trong job tiếp theo |

## Ranh giới transaction và phục hồi

Web request vẫn do `security.register_security` commit/rollback. Repository không
commit hoặc tạo session riêng. CSRF, RLS, khóa tenant, thứ tự khóa phòng/quỹ,
idempotency và append-only ledger giữ nguyên cơ chế hiện có. Worker vẫn tự sở hữu
transaction và scope của từng lượt chạy. Không đổi schema hoặc thêm dependency.

Audit thêm bản ghi rồi publish event đồng bộ. Notification subscriber chạy trước
subscriber xếp job ARI. Nếu subscriber lỗi, lỗi đi về transaction owner để rollback;
không bắt lỗi và báo thành công. Event bus này không phải message broker và không
bảo đảm giao sự kiện qua một hệ thống ngoài database. Job channel hiện có đóng vai
trò công việc bền vững; không thêm một hàng đợi trong bộ nhớ để gọi OTA sau commit.

Workflow booking dùng **forward recovery**, không tự hủy booking làm compensation:

1. Lấy và kiểm tra revision từ adapter.
2. Import bằng cơ chế chống trùng/stale revision hiện có.
3. Lưu receipt, chuyển job import sang `succeeded` để giải phóng queue slot, rồi xếp
   `ack_revision` trong cùng transaction của worker. `fetch_and_import()` tách hai
   bước đầu để worker giữ cơ chế backpressure và xử lý review hiện hành.
4. Job ACK kiểm tra receipt đã lưu cho đúng tenant/revision và outcome thuộc
   `imported`, `stale`, `cancelled` trước khi gọi Channex. Lỗi upstream đi qua cơ
   chế retry/backoff cũ; không ACK nếu import chưa thành công.

Chuẩn hóa OTA dùng quy tắc thuần hiện hành, gồm currency catalog, tách thuế/dịch vụ
và kiểm tra tổng tiền. `ProviderError` và remote identifier dùng chung giữa domain,
workflow và client. Availability policy giữ cơ chế đóng bán khi booking đang chờ
đối soát (`inventory_hold`), kể cả tồn tính toán đang âm.

Pacing ARI, thời gian chờ bền vững, publication footprint và cơ chế pause mapping
vẫn nằm trong worker hiện tại. Factory không tự retry thao tác tạo resource.

## Phạm vi còn chuyển tiếp

Đây là nền tảng hexagonal được áp dụng trên toàn bộ lớp HTTP và các quy tắc đã
tách, **chưa phải tách hoàn toàn mọi ORM entity và SQL khỏi application**.
Repository hiện bao phủ projection reservation, persistence của pricing engine
và receipt/ACK workflow. Các thao tác ghi booking, catalog, tài chính, kho, quản
trị và một số query worker vẫn dùng SQLAlchemy trong application/service. Việc
chuyển tiếp này được giữ rõ để tránh thay đồng thời các khóa và transaction quan
trọng khi chưa có kiểm thử PostgreSQL.

Khi tách tiếp, thêm operation cụ thể vào port, chuyển nguyên predicate/lock/order
sang repository, inject tại composition root, rồi chạy kiểm thử database của
nghiệp vụ đó. Không đưa Flask, model hoặc session vào `domain.py`.

## Kiểm chứng ngày 03/11/2026

Từ thư mục `backend`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -q
.\.venv\Scripts\python.exe -m ruff check pms_api common tests
```

Kết quả: `Ran 241 tests`, `OK (skipped=100)`; Ruff không báo lỗi. 100 nhóm kiểm
thử cần PostgreSQL bị bỏ qua vì chưa có database test riêng. Đây không phải bằng
chứng rằng các nghiệp vụ database đã được kiểm thử thành công.

Kiểm tra hợp đồng giữ nguyên 215 URL rule, endpoint và HTTP method so với fixture
hiện hành; smoke check nạp thành công 175 handler lazy. Đối chiếu AST với snapshot
workspace ngay trước lần chỉnh sửa này xác nhận 175 thân handler giữ nguyên logic
khi quy đổi context/payload/JSON, khoảng ngày query và factory qua port; toàn bộ
175 bộ decorator được giữ nguyên. Snapshot này bao gồm các thay đổi có sẵn trong
workspace, không lấy application cũ làm nguồn khôi phục logic.

Các test bổ sung kiểm tra dependency và HTTP delegation; inject/khôi phục runtime;
context actor/tenant hiện hành giữa các app; thứ tự persist → notification → channel
và truyền lỗi subscriber; predicate tenant và khóa reservation/voucher; receipt
ACK theo tenant/revision/outcome; policy tồn kho; pricing với repository giả; và
worker import giải phóng queue slot trước khi xếp ACK, không ACK booking cần review.
Mock phải patch module sở hữu hàm (`application`, `domain`, `repository` hoặc
`channel_adapter`), thay vì tên được route chuyển tiếp qua `__getattr__`.

Để kiểm thử database khi đã có cluster local của dự án:

```powershell
.\.venv\Scripts\python.exe scripts/run_domain_tests.py
```

Lần chạy hiện tại báo `Managed local PostgreSQL is unavailable; no existing
database was changed.` Script chỉ tạo/xóa database `pms_test_<uuid>` riêng khi có
cluster local được quản lý. Có thể dùng `TEST_DATABASE_URL` và
`TEST_DATABASE_MIGRATION_URL` theo quy tắc trong `tests/domain_fixture.py`, rồi chạy
unittest trực tiếp. CI dùng `scripts/run_ci_tests.py` để từ chối thiếu database hoặc
bất kỳ test bị skip nào. Chưa có kết quả PostgreSQL hoặc Channex staging cho lần
refactor này; không chạy OTA mutation hay chỉnh sửa database nghiệp vụ.
