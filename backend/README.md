# LOHA PMS Backend

Backend Flask/PostgreSQL đã có BE-01–05: đăng nhập bằng session cookie, khách sạn/membership/quyền/RLS, cấu hình phòng và danh mục, giá theo ngày/khóa bán, nhiều phòng/khách trong booking, nhận phòng, dịch vụ/thuế/phí/chiết khấu, cọc/thanh toán/hoàn tiền và checkout. Frontend dùng API thật; chỉ lựa chọn khách sạn được lưu trong trình duyệt. Dữ liệu demo cũ trong localStorage không được nhập tự động.

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

BE-06 và BE-07 thêm migration `0005_finance` và `0006_housekeeping`; giữ nguyên lịch sử 0001–0004. Sau khi triển khai code mới, chạy `python manage.py db upgrade` bằng `DATABASE_MIGRATION_URL` của Coolify rồi kiểm tra `/api/ready`. PostgreSQL local và Coolify vẫn là hai database riêng. Chi tiết chức năng và kiểm chứng: [BE06_07_IMPLEMENTATION_REPORT.md](../BE06_07_IMPLEMENTATION_REPORT.md).

BE-08–09 có báo cáo vận hành/tài chính và quản trị hai gói FREE/PRO. Bản sửa P1 thêm migration `0007_subscription_controls` sau `cdb4bc7d62d0`: RLS, lịch sử thuê bao chỉ thêm, điều khoản/quota và danh mục hai gói mặc định nếu danh mục trống. Không sửa migration cũ hoặc thay dữ liệu gói đã có. Chạy `python manage.py db upgrade` trong backend Coolify dùng cấu hình runtime của Coolify, rồi kiểm tra `/api/ready`; không dùng `.env` local trên host. Xem [API_CONTRACT.md](API_CONTRACT.md) và [báo cáo sửa P1](../BE08_09_P1_FIX_REPORT.md) để biết định nghĩa chỉ số và kết quả kiểm chứng.

BE-10/11 bổ sung `0008_inventory` → `0009_pricing`: kho có sổ biến động/POS tiêu hao,
giá cuối tuần/LOS, voucher/khuyến mãi và tỷ giá VND/USD. Chạy migration bằng tài khoản
migrator trước khi mở nghiệp vụ mới, rồi kiểm tra `/api/ready`. Giao dịch cũ được
giữ tiền gốc/tỷ giá cũ; cấu hình tỷ giá mới áp dụng giao dịch mới. Channex là nhà cung
cấp đã chọn cho BE-12, chưa có đồng bộ OTA trong hai nhóm này.

## Channex và thông báo (BE-12)

Migration mới: `0010_channels` → `0011_notifications`. Chạy migration trước khi
mở giao diện OTA/thông báo. Downgrade từ chối xóa cấu hình/lịch sử đã phát sinh.
Thông báo trong ứng dụng được lưu cùng giao dịch nghiệp vụ, hộp thư riêng từng
người nhận và cấu hình vai trò do owner quản lý. Email/mobile chưa được kích hoạt.

Trong màn hình OTA, chọn staging và lấy hai tên biến môi trường riêng cho khách
sạn. Người vận hành đặt khóa API Channex và secret webhook ngẫu nhiên (ít nhất 32
ký tự) vào đúng các biến **runtime phía server**, sau đó cấu hình property và
mapping room type/rate plan. Các biến `VITE_` không được chứa những khóa này.
Production chỉ đọc biến runtime; `.env` local không cấp khóa production.

Chạy worker riêng bằng cùng image/code và runtime database:

```sh
python manage.py process-channel-jobs --watch --interval 15 --limit 10
```

Worker cần cả các biến Channex giống backend. Có thể chạy một lượt với
`--tenant <tenant_id>` để giới hạn một khách sạn. Web server chỉ tạo hàng đợi;
nếu không chạy worker thì trạng thái giữ `queued`. Worker dùng dữ liệu tồn/giá
hiện tại, kiểm tra quyền/gói và thử lại lỗi tạm thời. Không cần Redis/Celery.
Worker nhận booking mỗi phút để bù webhook bị lỡ và xếp lịch gửi tồn/giá cho
366 ngày mỗi ngày, chia thành các tác vụ tối đa 31 ngày.

Mapping đã có lịch sử không được đổi hoặc tắt tùy ý. Tắt kết nối chỉ dừng worker,
không đóng bán trên OTA; người vận hành phải xử lý tồn/đóng bán tại Channex trước
khi thay đổi hệ thống. ARI hiện gửi giá cơ bản hoặc giá theo ngày, chưa chuyển
quy tắc LOS, voucher và khuyến mãi PMS thành rate plan OTA.

Tạo webhook Channex tới `/api/channex/webhooks/<tenant_id>` và cấu hình header
`X-Channex-Webhook-Secret` bằng secret tương ứng. Booking không xử lý được giữ
trạng thái lỗi và không ACK; operator cần kiểm tra lý do trước khi thử lại.
Trước dùng thật, kiểm thử staging gồm ARI, booking mới/sửa/hủy, nhận lại cùng
revision và ACK. Kiểm thử HTTP giả lập không thay cho nghiệm thu sandbox thật.
Xem [hợp đồng API](API_CONTRACT.md) và [checklist BE-12](../tasks/be12.md).

### Hồ sơ khách hàng và hóa đơn Manager

Manager bổ sung hồ sơ liên hệ/ghi chú nội bộ, tài khoản khách sạn, hóa đơn phần
mềm, công nợ, tổng quan hệ thống và hồ sơ/phiên đăng nhập cá nhân. Cần áp dụng
`0013_manager_billing` và `0014_manager_customers` bằng `python manage.py db upgrade`
trong backend của môi trường triển khai, rồi kiểm tra `/api/ready`. Hai migration
chỉ thêm bảng; downgrade bị chặn khi đã có hồ sơ hoặc hóa đơn để giữ dữ liệu.
Hóa đơn SaaS tách khỏi doanh thu khách sạn và chỉ dành cho vai trò hệ thống.
Ghi nhận khoản thu chưa tự gia hạn gói. Xem [báo cáo Manager](../tasks/manager-completion.md)
và [trang lỗi LOHA](../tasks/error-pages.md).

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


class ListGuestsView(CommonMethodView):
    @staticmethod
    @require_tenant("guests.view")
    def dispatch_request(tenant_id):
        return ListGuestsView.json_response({"guests": load_guests(tenant_id)})
```

Đăng ký trong `urls.py` theo mẫu:

```python
URL.register(
    booking, URL.LIST_GUESTS, "pms_api.bookings.routes:ListGuestsView",
    endpoint="list_guests", methods=["GET"],
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
Chi tiết kiểm chứng: [báo cáo chuẩn API](../tasks/api-standardization.md).
