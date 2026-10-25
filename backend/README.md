# LOHA PMS Backend

Kiến trúc backend: xem [ánh xạ design pattern và phạm vi refactor](ARCHITECTURE.md).
HTTP views đã tách sang lớp application; tài liệu ghi rõ phần domain/repository,
transaction, khả năng tương thích và giới hạn kiểm chứng PostgreSQL.

Backend Flask/PostgreSQL đã có nền tảng quyền/RLS, phòng/khách/booking, thanh toán, POS/quỹ, buồng phòng, kho, giá và tỷ giá, báo cáo, thuê bao và tích hợp Channex. Frontend dùng API thật; chỉ lựa chọn khách sạn được lưu trong trình duyệt. Dữ liệu demo cũ trong localStorage không được nhập tự động. Xem [hợp đồng API](API_CONTRACT.md) và [báo cáo cập nhật 14/10/2026](../docs/reports/reviews/remaining-functions-2026-10-14.md) để phân biệt phần đã triển khai, giới hạn và phần còn cần nghiệm thu.

## Bổ sung nghiệp vụ — 14/10/2026

- Hồ sơ khách sạn lưu liên hệ, website/logo HTTPS, mã số thuế, ngân hàng và ngôn ngữ hồ sơ. Logo dùng URL, chưa có tải ảnh lên.
- Danh mục thu/chi được quản lý trong Settings; phiếu thu/chi lưu tên và loại danh mục tại thời điểm ghi, có lọc danh mục và mở đúng phiếu từ lịch sử hoa hồng.
- Booking ghi nhận **Không đến (NO_SHOW)** từ ngày nhận phòng theo múi giờ khách sạn, trả tồn phòng và giữ nguyên tiền đã ghi. Không tự tính phí hoặc chuyển tiền cọc thành phí.
- Báo cáo nguồn/phòng/hạng phòng, hủy, quốc tịch và giảm giá dùng dữ liệu thật, có quyền REPORTS_ADVANCED và xuất CSV.
- Hoa hồng chốt sau checkout trên tiền phòng sau giảm giá tiền phòng, lưu tỷ lệ lịch sử, cho chi một phần và liên kết phiếu chi. Booking có chiết khấu hóa đơn chưa phân bổ hoặc điều chỉnh sau checkout bị chặn chi để đối soát; không tự gọi ngân hàng/OTA.
- Client sửa họ tên, xem phiên đăng nhập và thu hồi các phiên khác. Workspace cập nhật nền mỗi 30 giây hoặc khi quay lại cửa sổ, giữ bản nháp đang sửa; có thông báo và tải lại khi đọc thất bại. Booking có phiếu xem/in; CSV có tại booking, báo cáo, buồng phòng và nhật ký Manager.

Migration nối tiếp là `0018_channel_mapping_lifecycle` → `0019_cash_categories` →
`0020_no_show` → `0021_booking_commissions`, hợp nhất với
`0019_self_service_audit` tại `0022_merge_client_settings` để hỗ trợ nhật ký sửa hồ sơ/
thu hồi phiên cho tài khoản khách sạn. Áp dụng bằng `python manage.py db upgrade`
với cấu hình migration của môi trường đích trước khi mở phiên bản frontend mới,
rồi kiểm tra `/api/ready`. Các migration giữ dữ liệu cũ; downgrade từ chối bỏ cột/
bảng nếu đã có lịch sử danh mục, no-show hoặc hoa hồng. Kiểm thử database tạm
không thay cho việc áp migration trên database nghiệp vụ.

Buồng phòng có worker lập kế hoạch tự động, chạy riêng với cùng image và cấu hình
database runtime của API. Thay email ví dụ bằng tài khoản SYSTEM_MANAGER hoặc
SUPER_ADMIN đang hoạt động; lệnh dùng tài khoản đó để ghi nhật ký, không tạo tài
khoản mới và không nhận mật khẩu:

```sh
python manage.py process-housekeeping-plans --actor-email manager@example.com --watch --interval 900
```

Bỏ `--watch` để chạy một lượt; thêm `--tenant <tenant_id>` để giới hạn khách sạn.
Worker dùng ngày hiện tại theo múi giờ từng khách sạn, kiểm tra gói/quyền hiện tại
và dùng cùng bộ tạo kế hoạch với nút trên giao diện. Lặp lại không tạo trùng việc;
booking thêm sau lần chạy trước vẫn được bổ sung. Web API không tự khởi động
worker này. Worker Channex vẫn là tiến trình riêng như hướng dẫn bên dưới.

Night Audit/chốt ngày và tự ghi doanh thu từng đêm chưa triển khai; quy tắc ghi
nhận cần được chốt trước khi thêm bút toán. Các phần còn lại nằm trong báo cáo
ngày 14/10, không coi toàn bộ thiết kế hệ thống đã hoàn thành.

## Chạy trên Windows

Thực hiện các lệnh PowerShell sau từ thư mục `backend`. Cần Python 3.14 và bộ công cụ PostgreSQL 18 (`initdb`, `pg_ctl`, `psql`). Script tạo một PostgreSQL local riêng để phát triển, không sử dụng database trên Coolify.

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/local_postgres.py start
.\.venv\Scripts\python.exe manage.py db upgrade
.\.venv\Scripts\python.exe manage.py db-check
# Chỉ lần đầu trên pms_local trống: tạo khách sạn/danh mục và tài khoản local.
.\.venv\Scripts\python.exe manage.py seed-local
.\.venv\Scripts\python.exe manage.py run --host 127.0.0.1 --port 5000
```

Mặc định PostgreSQL local chạy ở `127.0.0.1:15432`, database `pms_local`. Script tạo tài khoản `pms_app` cho backend và `pms_migrator` cho migration, tự tạo mật khẩu ngẫu nhiên và file `.env` local nếu file chưa tồn tại; không ghi đè `.env` đã có. Cluster, thông tin tài khoản và log nằm trong `backend/.local-postgres/`. File `.env` và thư mục này được loại khỏi Git; giữ chúng trên laptop để tiếp tục dùng dữ liệu sau khi khởi động lại.

Script tìm bộ công cụ ở `C:\Program Files\PostgreSQL\18\bin` hoặc `PATH`. Nếu PostgreSQL cài ở nơi khác, đặt `$env:PG_BIN = 'D:\PostgreSQL\18\bin'` trước khi chạy. Script sử dụng cluster riêng và không sửa PostgreSQL service ở port `5432`. Muốn chọn port khác khi tạo cluster lần đầu, dùng `start --port 15433`; các lần sau script dùng port đã lưu.

Ở cửa sổ PowerShell thứ hai, kiểm tra API:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/api/health
Invoke-RestMethod http://127.0.0.1:5000/api/ready
```

Quản lý PostgreSQL local:

```powershell
.\.venv\Scripts\python.exe scripts/local_postgres.py status
.\.venv\Scripts\python.exe scripts/local_postgres.py stop
.\.venv\Scripts\python.exe scripts/local_postgres.py start
```

Sau khi thiết lập lần đầu, chạy `start_backend.bat` ở thư mục gốc để khởi động database local, áp dụng migration và chạy API. PostgreSQL này không được đăng ký làm Windows service, nên cần chạy lại script sau khi khởi động lại laptop.

### Xem database bằng pgAdmin

Trong pgAdmin, chuột phải **Servers → Register → Server**. Tab General đặt tên `PMS Local`; tab Connection điền:

| Trường | Giá trị mặc định |
| --- | --- |
| Host name/address | `127.0.0.1` |
| Port | `15432` |
| Maintenance database | `pms_local` |
| Username | `pms_app` |
| Password | Mật khẩu trong `DATABASE_URL` của `backend/.env` (phần giữa `pms_app:` và `@127.0.0.1`). |

Save rồi mở `PMS Local → Databases → pms_local → Schemas → public → Tables` và Refresh. Có các bảng `tenants`, `room_types`, `physical_rooms`, `guests`, `reservations`, `reservation_rooms`, `reservation_nights`, `payments`, `refunds`, `ledger_entries`... Kết nối PostgreSQL mặc định ở port `5432` là cluster khác nên không hiển thị database này. Tài khoản `pms_app` trong pgAdmin không có tenant context nên các bảng RLS sẽ không hiện dữ liệu khi SELECT trực tiếp; xem dữ liệu qua ứng dụng hoặc dùng tài khoản quản trị local riêng cho kiểm tra nội bộ. [Hướng dẫn kết nối pgAdmin](https://www.pgadmin.org/docs/pgadmin4/latest/server_dialog.html)

Nếu đã có PostgreSQL riêng, điền kết nối vào `.env` theo `.env.example`, rồi chạy `db upgrade` và `db-check`; không cần dùng script local.

## Cấu hình theo môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `APP_ENV` | `development` khi chạy local; `production` trên Coolify. |
| `DATABASE_URL` | Bắt buộc. URL PostgreSQL của tài khoản backend. |
| `DATABASE_MIGRATION_URL` | URL tài khoản tạo/sửa schema. Nếu bỏ trống, migration dùng `DATABASE_URL`. |
| `CORS_ORIGINS` | Danh sách origin frontend, ngăn cách bằng dấu phẩy; gồm giao thức và port nếu có, không có đường dẫn. |
| `PORT` | Local mặc định `5000`; container dùng `8000`. |

Backend chấp nhận `postgres://`, `postgresql://` và `postgresql+psycopg://`, rồi dùng driver Psycopg 3. Mật khẩu chứa ký tự đặc biệt phải được mã hóa theo URL.

Trong `development`/`testing`, backend đọc `.env` và ưu tiên các biến đã được đặt trong môi trường chạy. Trong `production`, backend không đọc `.env`; thiếu `DATABASE_URL` thì khởi động thất bại, không tự chuyển sang database local. Dùng `manage.py` cho các lệnh dự án: entry point này tắt việc Flask CLI tự nạp `.env`/`.flaskenv`, để chỉ cấu hình ứng dụng quyết định đọc file theo `APP_ENV`. Docker còn đặt `FLASK_SKIP_DOTENV=1`.

Local cho phép frontend ở `http://127.0.0.1:5173` và `http://localhost:5173` khi chưa đặt `CORS_ORIGINS`. Production cần đặt origin thật, ví dụ `https://pms.example.com`; nếu không đặt thì không cho phép truy cập API khác origin từ trình duyệt.

| Nơi chạy | Nguồn cấu hình | Database |
| --- | --- | --- |
| Laptop | `backend/.env` | `pms_local` trên laptop |
| Coolify | Environment Variables của ứng dụng backend | PostgreSQL trên Coolify |

Commit/push đưa code và migration lên Git, không đưa URL bí mật hay dữ liệu local lên Coolify. Sau khi thiết lập Environment Variables, các lần deploy tiếp tục sử dụng URL đã lưu ở Coolify.

## Migration và kiểm tra database

```powershell
# Áp dụng các migration đã có trong repository.
.\.venv\Scripts\python.exe manage.py db upgrade

# Kiểm tra kết nối và phiên bản migration hiện tại.
.\.venv\Scripts\python.exe manage.py db-check

# Khi bổ sung/sửa models: tạo migration, đọc kỹ file sinh ra, rồi upgrade.
.\.venv\Scripts\python.exe manage.py db migrate -m "describe schema change"
```

Chuỗi migration: `0001_backend_baseline` → `0002_identity` → `0003_catalog` → `0004_booking`. Có extension `btree_gist` để PostgreSQL chặn hai booking đang hoạt động trùng phòng/ngày. Tài khoản migration cần quyền database owner để cài extension này. Không chạy `db init` lại vì thư mục migrations đã có trong Git. File do `db migrate` sinh ra cần được kiểm tra trước khi áp dụng; Alembic không tự phát hiện đầy đủ mọi thay đổi schema. [Tài liệu Flask-Migrate](https://flask-migrate.readthedocs.io/en/latest/)

## Tài khoản và nghiệp vụ local

`seed-local` chỉ chạy khi APP_ENV=development, host loopback, database pms_local và chưa có tài khoản. Nó tạo hai khách sạn độc lập, phòng 101–103 và danh mục tối thiểu, không tạo booking hoặc gói thương mại. Email/mật khẩu ngẫu nhiên nằm trong `backend/.local-postgres/demo-users.json` (được Git ignore). Mật khẩu demo cũ `password123` không còn dùng. Có Owner, Lễ tân, Buồng phòng, Kế toán và Super Admin; Owner quản lý nhân viên, Admin tạo khách sạn/cấp Owner.

Trên môi trường khác, chạy `python manage.py init-admin` trong terminal backend: nhập email/tên/mật khẩu qua prompt ẩn; sau đó đăng nhập Admin để tạo khách sạn và Owner. Không chạy seed local trên production.

Luồng thử: Owner → Settings tạo phòng/nguồn/dịch vụ/phương thức thanh toán/quỹ → Reservations tạo booking → tab Thanh toán thu cọc → nhận phòng (trong ngày lưu trú, tất cả phòng sạch) → thêm dịch vụ/thuế/phí hoặc chiết khấu → thanh toán hết → trả phòng → Housekeeping dọn phòng. Booking mới luôn CONFIRMED. Nhận phòng không đổi phòng/ngày trong luồng hiện tại. Checkout bị chặn khi còn nợ; trả phòng chuyển tất cả phòng sang bẩn. Giá từng đêm được snapshot; đổi danh mục/giá không thay booking cũ. Đổi tiền tệ sau khi đã có booking bị chặn; đa tiền tệ thuộc BE-11.

Các khoản thu và hoàn tạo ledger cùng transaction, không xóa giao dịch cũ. Hoàn tiền có lý do và không vượt số đã thu; có thể hoàn cho booking đã hủy, điều chỉnh sau checkout thuộc BE-06. `Idempotency-Key` bắt buộc cho thu/hoàn/thêm chi phí; UI giữ cùng mã khi thử lại một thao tác, kể cả tải lại sau lỗi chưa rõ kết quả. Trình duyệt chỉ giữ fingerprint đã hash và mã thao tác trong sessionStorage, không giữ nội dung tiền hoặc token đăng nhập. Cùng mã khác nội dung bị từ chối. Quỹ có loại `cash` hoặc `bank`, không thể đổi loại khi đã có giao dịch. Thuế/phí hiện được nhập rõ thành dòng cộng; chiết khấu thành dòng trừ, không tự áp chính sách thuế chưa chốt.

## Frontend và Coolify

Local chạy frontend bằng `npm run dev`; Vite proxy `/api` đến `http://127.0.0.1:5000`. Production cần route `/api` đến backend tại cùng domain, hoặc đặt biến build frontend `VITE_API_BASE_URL=https://api.example.com` với API cùng site với frontend. Biến này chỉ là URL API công khai, tuyệt đối không dùng DATABASE_URL ở frontend. Backend đặt `CORS_ORIGINS=https://pms.example.com` đúng origin frontend; cookie HttpOnly/SameSite=Lax và Secure ở production, mutation có CSRF. Khi đi qua Tunnel/proxy, vẫn cần origin HTTPS thật trong CORS_ORIGINS.

Runtime `pms_app` phải không là superuser, BYPASSRLS hoặc owner các bảng. Default privileges phải cấp SELECT/INSERT/UPDATE/DELETE cho các bảng do migrator tạo; RLS bảo vệ dữ liệu theo transaction-local tenant context. Các bảng identity/session/login-limit là dữ liệu global nội bộ; audit có tenant nullable cho sự kiện quản trị hệ thống. Các dòng tiền và audit có trigger chặn sửa/xóa. [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

POS đầy đủ, phiếu thu/chi độc lập, phân ca buồng phòng, báo cáo kế toán, kho, billing/hai gói và OTA thuộc BE-06 trở đi. Các luồng này không được báo lưu thành công bằng dữ liệu demo. Chưa deploy hoặc kiểm chứng Coolify trong lần triển khai local này.

| Endpoint | Kết quả |
| --- | --- |
| `GET /` | Thông tin dịch vụ. |
| `GET /api/health` | HTTP `200` khi tiến trình API còn hoạt động, không yêu cầu database. |
| `GET /api/ready` | HTTP `200` khi truy vấn database thành công và phiên bản Alembic khớp code; ở production tài khoản runtime còn phải không có quyền superuser hoặc bypass RLS. HTTP `503` khi chưa sẵn sàng. |

Lỗi readiness trả thông báo chung; không trả URL kết nối, mật khẩu hay chi tiết lỗi PostgreSQL ra trình duyệt.

## Deploy backend trên Coolify

Tạo **ứng dụng backend riêng** từ cùng repository; cấu hình Dockerfile, Base Directory `/backend`, Dockerfile Location `/Dockerfile` và port nội bộ `8000`. Dockerfile chạy Gunicorn với app factory `app:create_app()`.

Backend và PostgreSQL phải nằm trên cùng Server/Destination Docker network để dùng hostname trong Internal URL. [PostgreSQL trên Coolify](https://coolify.io/docs/databases/postgresql), [mạng nội bộ Coolify](https://coolify.io/docs/core/networking-in-coolify)

### Tạo tài khoản cho ứng dụng

Internal URL mặc định có thể dùng tài khoản admin `postgres`; không dùng tài khoản admin làm runtime production. Trong Terminal của container PostgreSQL, mở `psql -U postgres -d postgres` bằng tài khoản admin hiện có, rồi chạy mẫu sau **khi cần tạo một database PMS mới riêng biệt**. Thay tên nếu `pms_prod`, `pms_app` hoặc `pms_migrator` đã tồn tại.

```sql
CREATE ROLE pms_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE ROLE pms_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
\password pms_migrator
\password pms_app
CREATE DATABASE pms_prod OWNER pms_migrator;
\connect pms_prod
SET ROLE pms_migrator;
GRANT CONNECT ON DATABASE pms_prod TO pms_app;
GRANT USAGE ON SCHEMA public TO pms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pms_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pms_app;
RESET ROLE;
```

`\password` yêu cầu nhập mật khẩu trực tiếp, không đưa mật khẩu vào câu SQL hoặc Git. Dùng hostname và port từ Internal URL, nhưng thay username, mật khẩu và tên database bằng các giá trị vừa tạo. Runtime dùng `pms_app`; migration dùng `pms_migrator`. Default privileges áp dụng cho bảng được tạo bởi `pms_migrator`, vì vậy phải chạy migration bằng đúng tài khoản này.

Nếu database PMS riêng đã được tạo, dùng tên database đó và chỉ thiết lập các quyền còn thiếu theo chủ sở hữu hiện tại. Không chạy lại `CREATE DATABASE` hoặc đổi owner của database dùng chung. Migration không tự tạo PostgreSQL roles/database. Khi tạo database mới trong resource hiện có, chọn đúng database trong cấu hình backup của Coolify.

Trong **Configuration → Environment Variables** của ứng dụng backend, đặt:

| Biến | Giá trị |
| --- | --- |
| `APP_ENV` | `production` |
| `DATABASE_URL` | URL PostgreSQL nội bộ, dùng tài khoản runtime của ứng dụng. |
| `DATABASE_MIGRATION_URL` | URL cùng database, dùng tài khoản được phép migration; có thể bỏ trống nếu tài khoản runtime cũng quản lý schema. |
| `CORS_ORIGINS` | Domain frontend thật, ví dụ `https://pms.example.com`. |
| `PORT` | `8000` |

Các URL database chỉ bật **Runtime Variable**, tắt **Build Variable**. Save rồi deploy/restart để áp dụng cấu hình. Không thêm các URL này vào Git hoặc biến frontend có tiền tố `VITE_`. [Environment Variables của Coolify](https://coolify.io/docs/applications/configuration/environment-variables)

Chạy migration một lần cho mỗi lần triển khai có thay đổi schema:

```sh
python manage.py db upgrade
```

Đặt lệnh này ở **Post-deployment Command** để chạy migration từ code mới, hoặc chạy trong Terminal của container backend mới sau khi deploy. Pre-deployment của Coolify chạy trong container cũ và bị bỏ qua khi deploy lần đầu, nên không dùng nó để áp dụng migration vừa thêm vào code mới. Coolify đánh dấu deploy hoàn tất trước khi chạy Post-deployment Command; nếu migration lỗi, log có lỗi nhưng trạng thái deploy vẫn có thể thành công. Phải kiểm tra `/api/ready` sau mỗi lần triển khai. [Deployment commands trong Coolify](https://coolify.io/docs/applications/builds/dockerfile#deployment-commands)

Migration chạy lúc triển khai, không chạy trong Docker image build hoặc mỗi lần web worker khởi động. Với thay đổi nghiệp vụ sau này, migration cần tương thích với phiên bản đang chạy và được kiểm thử trước khi áp dụng production.

Đặt healthcheck container ở `/api/health` để container có thể khởi động trước migration lần đầu. Sau khi migration xong, kiểm tra `/api/ready` qua domain API; endpoint này cần trả HTTP `200` trước khi nối các chức năng nghiệp vụ frontend vào API. Healthcheck `/api/health` không xác nhận database sẵn sàng. Database trên Coolify vẫn dùng port nội bộ `5432`; Cloudflare Tunnel public domain ứng dụng/API, không cần public PostgreSQL.

Backend đọc URL từ cấu hình Coolify sau khi deploy. Việc kết nối PostgreSQL local thành công không xác nhận backend trên Coolify đã kết nối; cần kiểm tra `/api/ready` tại môi trường đó.

## Chạy kiểm thử

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Các kiểm thử tích hợp PostgreSQL chỉ chạy khi đặt rõ cả `TEST_DATABASE_URL` và `TEST_DATABASE_MIGRATION_URL`. Dùng URL runtime và migration của cùng một database kiểm thử riêng, tên bắt đầu bằng `pms_test_`, ví dụ `pms_test_backend`. Suite được phép thay đổi schema trong database này và từ chối tên database ngoài tiền tố đó; không trỏ vào `pms_local` hay database production. Các tests khác chạy mà không cần database thật.

Nếu đã thiết lập cluster local bằng `scripts/local_postgres.py`, có thể chạy toàn bộ suite bằng:

```powershell
.\.venv\Scripts\python.exe scripts/run_domain_tests.py
```

Lệnh này đọc cấu hình riêng của cluster, tạo database `pms_test_<UUID>` với hai role runtime/migration, chạy suite rồi xóa đúng database tạm vừa tạo. Không thay đổi schema hoặc dữ liệu `pms_local`. Không đưa mật khẩu vào tham số shell hoặc Git.

## Cấu trúc

- `app.py`: app factory được Gunicorn sử dụng.
- `manage.py`: CLI dự án với chính sách nạp cấu hình theo môi trường.
- `pms_api/__init__.py`: app factory và đăng ký routes.
- `pms_api/auth/`, `admin/`, `catalog/`, `bookings/`, `finance/`, `housekeeping/`: routes và models theo nghiệp vụ.
- `pms_api/workspace.py`: tổng hợp workspace khách sạn từ các phân hệ.
- `pms_api/config.py`, `extensions.py`, `security.py`, `core_models.py`, `rls.py`: cấu hình, kết nối và nền tảng dùng chung.
- `migrations/`: lịch sử schema Alembic được commit cùng code.
- `scripts/local_postgres.py`: tạo và quản lý PostgreSQL local.
- `scripts/run_domain_tests.py`: kiểm thử trên database tạm của cluster local.
- `tests/`: kiểm thử cấu hình, endpoint và database.
- `.env.example`: cấu hình mẫu; `.env` chứa cấu hình thật trên laptop.
- `Dockerfile`: image backend dành cho Coolify/Linux.

BE-06 và BE-07 thêm migration `0005_finance` và `0006_housekeeping`; giữ nguyên lịch sử 0001–0004. Sau khi triển khai code mới, chạy `python manage.py db upgrade` bằng `DATABASE_MIGRATION_URL` của Coolify rồi kiểm tra `/api/ready`. PostgreSQL local và Coolify vẫn là hai database riêng. Chi tiết chức năng và kiểm chứng: [BE06_07_IMPLEMENTATION_REPORT.md](../docs/reports/backend/BE06_07_IMPLEMENTATION_REPORT.md).

BE-08–09 có báo cáo vận hành/tài chính và quản trị hai gói FREE/PRO. Bản sửa P1 thêm migration `0007_subscription_controls` sau `cdb4bc7d62d0`: RLS, lịch sử thuê bao chỉ thêm, điều khoản/quota và danh mục hai gói mặc định nếu danh mục trống. Không sửa migration cũ hoặc thay dữ liệu gói đã có. Chạy `python manage.py db upgrade` trong backend Coolify dùng cấu hình runtime của Coolify, rồi kiểm tra `/api/ready`; không dùng `.env` local trên host. Xem [API_CONTRACT.md](API_CONTRACT.md) và [báo cáo sửa P1](../docs/reports/backend/BE08_09_P1_FIX_REPORT.md) để biết định nghĩa chỉ số và kết quả kiểm chứng.

BE-10/11 bổ sung `0008_inventory` → `0009_pricing`: kho có sổ biến động/POS tiêu hao,
giá cuối tuần/LOS, voucher/khuyến mãi và tỷ giá VND/USD. Chạy migration bằng tài khoản
migrator trước khi mở nghiệp vụ mới, rồi kiểm tra `/api/ready`. Giao dịch cũ được
giữ tiền gốc/tỷ giá cũ; cấu hình tỷ giá mới áp dụng giao dịch mới. Channex là nhà cung
cấp đã chọn cho BE-12, chưa có đồng bộ OTA trong hai nhóm này.

## Channex và thông báo (BE-12)

Trang Channex của Manager/Super Admin đọc property, loại phòng/gói giá, lịch sử
booking và tồn/giá trực tiếp từ Channex qua backend. Manager chọn nguồn và môi
trường rõ ràng; backend không tự chuyển nguồn khi lỗi. Có thể dùng khóa kết nối
đã lưu của từng khách sạn hoặc cấu hình thêm nguồn hệ thống bằng hai biến runtime
backend tùy chọn `CHANNEX_MANAGER_API_KEY_STAGING` và
`CHANNEX_MANAGER_API_KEY_PRODUCTION`. Không cần tạo khóa mới nếu nguồn khách sạn
đã có quyền đọc. Không đặt khóa trong biến `VITE_`; production không đọc `.env`.

Property Channex chưa liên kết LOHA vẫn hiện trong danh sách. Đọc dữ liệu không
tạo khách sạn, import/ACK booking hay đẩy tồn/giá. Dữ liệu tồn thiếu được hiển thị
là chưa biết. Giao diện LOHA thêm/sửa loại phòng và gói giá qua API Channex,
có CSRF và kiểm tra quyền hệ thống. Loại phòng đã ghép LOHA chỉ đổi tên; số phòng
và sức chứa được bảo vệ. Chỉ sửa giá mặc định của gói manual/per-room đơn giản;
gói phức tạp vẫn xem được. Tab Kênh OTA lấy danh mục adapter thật từ Channex,
cho tạo kết nối, kiểm tra thông tin, đọc phòng/gói giá OTA để ghép nối, đổi tên,
kiểm tra sẵn sàng, bật/dừng đồng bộ và xóa kết nối đã dừng. Khóa/mật khẩu OTA
không được trả lại trình duyệt; thay đổi chỉ gửi trường được adapter cho phép.
Giao diện giữ nguyên các thiết lập và ghép nối khác khi sửa một phần. Cấu hình
kênh dùng chung nhiều khách sạn chỉ được xem; đổi thiết lập/ghép nối phải dừng
đồng bộ trước. Dừng đồng bộ không đóng bán phòng trên OTA; Channex có thể lên lịch
xóa kết nối sau 30 ngày. Bật kết nối đẩy tồn/giá/hạn chế đầy đủ sang OTA.
Airbnb dùng liên kết OAuth do chủ tài khoản chấp thuận rồi chọn listing và gói
giá để ghép; phải gỡ listing trước khi dừng đồng bộ Airbnb. Không dùng iframe,
không xóa phòng/gói.
Khóa API ở lại backend. Sau kết quả ghi chưa xác nhận, tải lại danh mục trước khi
gửi lại để tránh tạo trùng. Thay giá mặc định không tự đẩy giá/tồn theo ngày.
Xem hợp đồng các endpoint `/api/admin/channex/...` tại [API_CONTRACT.md](API_CONTRACT.md).

Manager/Super Admin có danh sách Channex tập trung qua `GET /api/admin/channex`:
trạng thái kết nối, số phòng/loại phòng, ghép nối đang bật/đang đóng bán và tác vụ
mới nhất, lấy từ database local, không gọi Channex hay trả khóa/tham chiếu bí mật.
`GET /api/tenants/<tenant_id>/channels/catalog` tải loại phòng/gói giá của property
đã lưu cho dropdown, kể cả khi kết nối đang tạm dừng. API vẫn kiểm tra quyền
`channels.view`/`OTA_SYNC`, xác thực dữ liệu và giới hạn 100 mục mỗi danh mục;
gói giá không được ARI hỗ trợ vẫn hiển thị với `supported:false`.

Migration mới: `0010_channels` → `0011_notifications`. Chạy migration trước khi
mở giao diện OTA/thông báo. Downgrade từ chối xóa cấu hình/lịch sử đã phát sinh.
Thông báo trong ứng dụng được lưu cùng giao dịch nghiệp vụ, hộp thư riêng từng
người nhận và cấu hình vai trò do owner quản lý. Email/mobile chưa được kích hoạt.

Luồng cấu hình khóa trong ứng dụng cần migration `0013_channel_credentials` và
`CHANNEX_ENCRYPTION_KEY` chung cho API/worker. Tạo khóa Fernet **một lần**:

```sh
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Lưu khóa này trong runtime secret của Coolify, sao lưu riêng với database và dùng
cùng giá trị ở mọi API/worker. Không thay khóa tùy ý: khóa khác sẽ không đọc được
cấu hình đã lưu. Production chỉ đọc runtime; local đọc hai biến cấu hình chung
trong `.env`. Các biến `VITE_` không được chứa khóa.

Chủ khách sạn mở **Kênh OTA → Thiết lập kết nối**, chọn môi trường, nhập Property
ID/API key rồi **Kiểm tra & lưu**. Backend kiểm tra quyền và quyền đọc đúng property
trên Channex trước khi mã hóa cả API key/secret webhook, ràng buộc với tenant,
property và môi trường. Phản hồi chỉ chứa trạng thái, không trả khóa. Để trống API
key khi chỉnh sửa sẽ giữ khóa cũ; đổi property/môi trường phải nhập khóa mới và chỉ
được thực hiện trước khi có lịch sử. Bật lại kết nối sẽ xác minh lại khóa; tạm dừng
vẫn được khi Channex hoặc khóa mã hóa gặp sự cố. Xác minh property không chứng minh
quyền ghi ARI; cần kiểm thử tác vụ đồng bộ.

System Manager / Super Admin mở **Khách hàng & khách sạn → OTA** tại khách sạn cần
cấu hình. Kết nối, ghép phòng và lịch sử dùng đúng khách sạn trong đường dẫn,
không đổi khách sạn đang chọn ở PMS. Quyền OTA, trạng thái khách sạn và thuê bao
vẫn được kiểm tra như ở ứng dụng PMS. Migration `0017_merge_catalog_channels`
nối lịch sử OTA/manager với danh mục phòng; chạy `python manage.py db upgrade`
trước khi triển khai phiên bản này.

Đặt `CHANNEX_WEBHOOK_BASE_URL=https://api.example.com` (HTTPS origin, không có
path/query) chung cho API/worker để tự đăng ký webhook. Sau khi lưu khóa với đồng
bộ bật, job `setup_webhook` dùng secret đã mã hóa, tạo hoặc cập nhật webhook có đúng
callback `/api/channex/webhooks/<tenant_id>` và property. Worker tìm lại webhook
trước mỗi lần thử để tránh tạo trùng sau lỗi giao dịch. Theo dõi trạng thái riêng
trong OTA/lịch sử; lưu khóa thành công chưa có nghĩa webhook đã sẵn sàng. Nếu chưa
có HTTPS công khai, để trống biến này và dùng poll. Cấu hình cũ dùng biến theo
tenant vẫn hoạt động; nhập lại API key sẽ chuyển sang mã hóa, không tự chuyển đổi.

Chạy worker riêng bằng cùng image/code và runtime database:

```sh
python manage.py process-channel-jobs --watch --interval 15 --limit 10
```

Worker cần hai biến Channex chung giống backend (và biến theo tenant nếu còn dùng
cấu hình cũ). Có thể chạy một lượt với `--tenant <tenant_id>` để giới hạn một khách
sạn. Lưu khóa gọi Channex để xác minh property ngay; các tác vụ đồng bộ chỉ được
xếp hàng trên web, giữ `queued` nếu không chạy worker. Worker dùng dữ liệu tồn/giá
hiện tại, kiểm tra quyền/gói và thử lại lỗi tạm thời. Không cần Redis/Celery.
Worker nhận booking mỗi phút để bù webhook bị lỡ và xếp lịch gửi tồn/giá cho
366 ngày mỗi ngày, chia thành các tác vụ tối đa 31 ngày.

Migration `0023_channel_ari_pacing` lưu thời điểm được phép gửi ARI tiếp theo của
từng kết nối. Chạy `python manage.py db upgrade` trước khi khởi động API/worker
phiên bản mới. Các lần gửi tồn/giá hoặc đóng bán cách nhau ít nhất 7 giây; lỗi
tạm thời giữ nhịp chờ ít nhất 60 giây hoặc lâu hơn theo lịch thử lại của tác vụ.
Thời gian chờ được lưu trong database nên khởi động lại worker không bỏ qua nó;
nhận booking và ACK vẫn được xử lý trong thời gian chờ ARI. Nhịp thực tế còn phụ
thuộc `--interval`. Quy tắc này dựa trên
[giới hạn Channex](https://docs.channex.io/api-v.1-documentation/rate-limits).

Lỗi đang chờ thử lại vẫn có trong lịch sử đồng bộ và log, nhưng chỉ tác vụ đã
thất bại mới phát thông báo “Đồng bộ OTA thất bại”. Các thông báo cũ được giữ
nguyên. Log lỗi có `http_status` hoặc `cause` (`timeout`, `dns`, `tls`,
`connection`, `transport`) để phân biệt lỗi HTTP và lỗi kết nối; không ghi khóa
API hay nội dung booking. Trên Coolify cần chạy worker thường trực bằng lệnh
trên; ứng dụng backend API chỉ xếp hàng và không tự chạy worker.

Migration `0018_channel_mapping_lifecycle` bổ sung trạng thái ghép nối; chạy
`python manage.py db upgrade` và dùng cùng phiên bản cho API/worker. Lịch sử đăng
ký webhook hoặc lấy feed rỗng không khóa mã ghép nối. Backend ghi nhận mã và cửa
sổ ngày trước khi gửi ARI; ghép nối đã nhận booking hoặc có thể đã gửi dữ liệu
không được đổi mã phòng/gói giá. Migration giữ bảo vệ với lịch sử ARI cũ chưa
xác định được chính xác ghép nối đã sử dụng.

Tạm dừng ghép nối đã dùng tạo job `pause_mapping`: trạng thái `pauseRequested`
giữ nguyên cho đến khi Channex chấp nhận tồn bằng 0 và `stop_sell=true` trên các
cửa sổ đã ghi nhận và 366 ngày sắp tới. Khi đó worker mới đặt `active=false`.
Lỗi đóng bán không báo tạm dừng thành công; kiểm tra và thử lại tại Lịch sử đồng
bộ. Có thể bật lại cùng mã sau khi đóng bán hoàn tất; booking sửa/hủy vẫn nhận
qua ghép nối đã dùng. Ghép nối chưa dùng có thể sửa mã hoặc tạm dừng ngay.

Tắt toàn bộ kết nối chỉ dừng worker, không đóng bán trên OTA; cần hoàn tất đóng
bán trước khi tắt kết nối. ARI hiện gửi giá cơ bản hoặc giá theo ngày, chưa chuyển
quy tắc LOS, voucher và khuyến mãi PMS thành rate plan OTA.

Webhook mới dùng sự kiện `booking`, `send_data=false` và header ngẫu nhiên
`X-Channex-Webhook-Secret` do hệ thống tạo. Cấu hình cũ có thể giữ webhook đã đăng
ký thủ công. Booking không xử lý được giữ
trạng thái lỗi và không ACK; operator cần kiểm tra lý do trước khi thử lại.
Trước dùng thật, kiểm thử staging gồm ARI, booking mới/sửa/hủy, nhận lại cùng
revision và ACK. Kiểm thử HTTP giả lập không thay cho nghiệm thu sandbox thật.
Xem [hợp đồng API](API_CONTRACT.md) và [checklist BE-12](../tasks/be12.md).

Manager có thể tạo Property Channex ngay trong LOHA bằng
`POST /api/admin/channex/properties`. Chỉ `SUPER_ADMIN` và `SYSTEM_MANAGER`
được dùng, kèm phiên đăng nhập và CSRF. Body gồm
`{accountId,name,currency,timezone,country?,city?,address?,email?,phone?}`;
`accountId` phải là `system:staging` hoặc `system:production`, dùng khóa hệ thống
có quyền tạo Property (ví dụ All Properties). Tiền tệ hỗ trợ `VND`/`USD`, múi giờ
IANA; các trường tùy chọn trống được bỏ qua. Property được tạo với loại `hotel`
trong Default Group của tài khoản Channex. Response 201 gồm
`{environment,property:{id,name,currency,timezone,city,country,linkedHotel:null}}`.
Thao tác không tạo khách sạn PMS và không tự liên kết; chọn Property vừa tạo
để thực hiện ghép nối sau đó. Không tự thử lại khi lỗi hoặc timeout: tải lại danh
sách Property để kiểm tra kết quả trước khi tạo lại, tránh Property trùng.
Hợp đồng upstream: [Create Property API](https://docs.channex.io/api-v.1-documentation/hotels-collection/create-property-api).

### Hồ sơ khách hàng và hóa đơn Manager

Manager bổ sung hồ sơ liên hệ/ghi chú nội bộ, tài khoản khách sạn, hóa đơn phần
mềm, công nợ, tổng quan hệ thống và hồ sơ/phiên đăng nhập cá nhân. Cần áp dụng
`0013_manager_billing` và `0014_manager_customers` bằng `python manage.py db upgrade`
trong backend của môi trường triển khai, rồi kiểm tra `/api/ready`. Hai migration
chỉ thêm bảng; downgrade bị chặn khi đã có hồ sơ hoặc hóa đơn để giữ dữ liệu.
Hóa đơn SaaS tách khỏi doanh thu khách sạn và chỉ dành cho vai trò hệ thống.
Ghi nhận khoản thu chưa tự gia hạn gói. Xem [báo cáo Manager](../docs/reports/manager/manager-completion.md)
và [trang lỗi LOHA](../docs/reports/frontend/error-pages.md).

## Chuẩn viết API dùng common

Các API trong `pms_api/` dùng lớp nền trong `common/`. Mỗi package nghiệp vụ có
`urls.py` chứa `class URL(CommonURL)`, blueprint và đăng ký đường dẫn tới class
handler bằng `module:ViewClass`; `routes.py` chứa các lớp `CommonMethodView`.
Module một file có `health_urls.py`, `notifications_urls.py`, `workspace_urls.py`;
quản lý tính năng dùng `admin/features_urls.py`.

Ví dụ một handler có quyền theo khách sạn:

```python
from common import CommonMethodView
from ..security import require_tenant


class ListReservationsView(CommonMethodView):
    @staticmethod
    @require_tenant("reservations.view")
    def dispatch_request(tenant_id):
        return {"bookings": booking_snapshot(tenant_id)["bookings"]}
```

Đăng ký trong `urls.py` theo mẫu:

```python
URL.register(
    booking, URL.LIST_RESERVATIONS, "pms_api.bookings.routes:ListReservationsView",
    endpoint="list_reservations", methods=["GET"],
)
```

- `@staticmethod` nằm trên decorator quyền để giữ chữ ký `tenant_id` hiện tại.
  Các view không dùng decorator này cũng có thể dùng `get(self)`/`post(self)`
  theo Flask MethodView.
- Đọc JSON object qua `CommonMethodView.payload()` hoặc `RequestData.payload()`;
  `security.payload()` tiếp tục là đường gọi tương thích tới cùng helper.
- Dùng `ApiError(status, code, message, details=None)` cho lỗi HTTP. Giữ response
  `{error: {code, message, details?}}`, CSRF, RLS và transaction handler trong security.
- Dùng `ValueFormatter.iso()` và `decimal_text()` cho ngày nullable và chuỗi số
  bốn chữ số thập phân; validation tiền/ngày vẫn thuộc nghiệp vụ.
- Lazy registration cần `methods` rõ ràng. Chỉ handler của route được gọi mới
  được import; cache/lock tránh khởi tạo trùng khi request đầu chạy đồng thời.
- Khi thêm model, cập nhật `model_registry.py` để app/migration có đủ metadata
  trước khi handler được import. Thay đổi schema vẫn cần migration riêng.
- Các helper nghiệp vụ và import blueprint/URL từ `routes` cũ vẫn được giữ.
  Không thêm route bằng decorator blueprint trong `routes.py`.

Chuẩn hóa lần này giữ nguyên 117 rule, endpoint và HTTP methods, không đổi
schema, không thêm dependency. Dockerfile đã copy `common/` vào image backend.
Chi tiết kiểm chứng: [báo cáo chuẩn API](../docs/reports/backend/api-standardization.md).

## Gói tùy chỉnh, số phòng đăng ký và mã loại phòng — 10/10/2026

Chạy `python manage.py db upgrade` trong backend Coolify với biến môi trường runtime
của Coolify, rồi kiểm tra `/api/ready`. Migration `0015_plan_room_limits` nối sau
`0014_manager_customers`, tiếp theo là `0016_room_type_codes`. Cần nâng cấp backend
trước frontend vì model mới đọc `deleted`, `room_count` và `room_types.code`.

- Super Admin tạo/sửa/xóa khỏi danh sách bán/khôi phục gói tùy chỉnh. FREE/PRO là
  hai gói mặc định; mã gói đã có không đổi. Xóa giữ thuê bao và lịch sử cũ.
- Marketing lấy giá và tính năng từ `GET /api/public/plans`. Backend không cache;
  frontend tải lại khi mở trang hoặc quay lại tab. Lỗi API có nút thử lại.
- Mỗi thuê bao có số phòng đăng ký hữu hạn (`roomCount`); đăng ký 10 phòng chỉ dùng
  tối đa 10 phòng, đồng thời không vượt trần gói. Khách sạn chưa cấp gói không thêm
  phòng được. Giá tháng/năm vẫn là giá quản trị nhập, không tự nhân theo số phòng.
- Nâng cấp giữ quota cũ nếu có trần; thuê bao trước đây không có trần nhận số phòng
  đang hoạt động (ít nhất một). Kiểm tra và điều chỉnh theo số phòng thực tế đã
  đăng ký với khách sạn sau nâng cấp. Không xóa phòng hoặc sửa tiền đã ghi nhận.
- Mã loại phòng do người dùng nhập tách khỏi UUID, giữ cả `2` và `02`. Dữ liệu cũ
  chưa có mã để trống; liên kết phòng/booking/Channex vẫn dùng UUID.
- Đơn vị tính mặc định được lưu cho từng khách sạn; giữ đơn vị tùy chỉnh và không
  tự bật lại đơn vị đã tắt. Settings lưu trực tiếp; không cần nút Thêm mới dư.
- Booking tạo trực tiếp mặc định VND; OTA giữ tiền tệ Channex gửi về, không suy ra
  từ quốc tịch khách. Hiện hỗ trợ VND/USD; cần tỷ giá cấu hình khi khác tiền cơ sở.

Xem chi tiết payload và quyền tại [API_CONTRACT.md](API_CONTRACT.md).
