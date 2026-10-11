# LOHA PMS System

Hệ thống quản lý khách sạn SaaS: website giới thiệu, ứng dụng khách sạn và trang quản trị dùng chung API Flask/PostgreSQL.

| Thư mục | Trách nhiệm |
| --- | --- |
| `frontend/` | React/Vite: marketing, PMS client và manager. |
| `backend/` | Flask API, SQLAlchemy models, Alembic migrations và kiểm thử. |
| `docs/` | Cấu trúc và quy tắc tổ chức mã nguồn. |
| `tasks/` | Kế hoạch công việc. |
| `graphify-out/` | Đồ thị phân tích mã nguồn; không phải mã chạy ứng dụng. |

## Chạy local

Thiết lập PostgreSQL và backend theo [backend/README.md](backend/README.md). Có thể chạy `start_backend.bat` sau khi đã cấu hình môi trường local.

```powershell
cd frontend
npm ci
npm run dev
```

Frontend ở `http://127.0.0.1:5173`, Vite chuyển `/api` đến backend ở `http://127.0.0.1:5000`. Đăng nhập tại `/id/login`; quản trị hệ thống dùng `/manager`.

## Tài liệu

- [Cấu trúc dự án](docs/ARCHITECTURE.md).
- [Frontend: luồng đã nối API và giới hạn](frontend/README.md).
- [Backend: database, migration, kiểm thử và Coolify](backend/README.md).
- [Hợp đồng API](backend/API_CONTRACT.md).
- [Thiết kế hệ thống](pms_system_design_final.md).

`DATABASE_URL` chỉ thuộc backend. Local dùng `backend/.env`; Coolify dùng biến môi trường runtime. Không đưa mật khẩu hoặc dữ liệu PostgreSQL vào Git.
