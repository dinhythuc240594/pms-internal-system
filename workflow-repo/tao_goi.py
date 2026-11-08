"""Create dated, byte-exact handoff packages from the existing PMS workspace.

This script writes only inside workflow-repo. It never stages, commits, pushes,
changes authors/dates, deletes files, runs migrations or calls an external API.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
import shutil
import subprocess


BASE = Path(__file__).resolve().parent
REPO = BASE.parent
START = date(2026, 11, 8)
END = date(2026, 12, 1)

BACKEND_TOPICS = [
    ("backend-platform", "Nền tảng backend, cấu hình và khởi động"),
    ("backend-infrastructure", "Common, adapter, composition và hạ tầng API"),
    ("backend-identity", "Xác thực, vai trò, membership và cách ly khách sạn"),
    ("backend-catalog", "Danh mục khách sạn, phòng, tiền tệ và kiểm tra dữ liệu"),
    ("backend-booking-domain", "Mô hình và quy tắc đặt phòng"),
    ("backend-booking-api", "API đặt phòng và vòng đời lưu trú cơ bản"),
    ("backend-finance", "Dịch vụ, POS, thu chi và sổ quỹ"),
    ("backend-housekeeping", "Buồng phòng, lịch và phân công công việc"),
    ("backend-reports", "Dashboard và báo cáo nghiệp vụ/tài chính"),
    ("backend-inventory", "Kho, chứng từ và biến động tồn"),
    ("backend-pricing", "Chính sách giá, khuyến mãi và snapshot"),
    ("backend-channel-core", "Nền tảng adapter, credential và mô hình Channex"),
    ("backend-channel-ari", "API, chính sách và hàng đợi đồng bộ ARI"),
    ("backend-channel-import", "Nhận booking, webhook và onboarding OTA"),
    ("backend-channel-operations", "Lịch sử, dữ liệu từ xa và ngoại lệ OTA"),
    ("backend-manager-core", "Quản trị tenant, khách hàng và tài khoản hệ thống"),
    ("backend-features", "Quản lý tính năng và quyền sử dụng hiệu lực"),
    ("backend-manager-channel", "Cấu hình Channex và công cụ quản trị từ xa"),
    ("backend-manager-provider", "Quản trị kênh, Airbnb và thống kê nhà cung cấp"),
    ("backend-notifications", "Thông báo và sự kiện trong ứng dụng"),
    ("backend-saas", "Thuê bao, billing và hạn mức phòng"),
    ("backend-reconciliation", "Đối soát ngày nghiệp vụ và Night Audit"),
    ("backend-stay-commissions", "Thay đổi lưu trú và hoa hồng"),
    ("backend-final-assembly", "Migrations, công cụ kiểm thử và tài liệu bàn giao"),
]

FRONTEND_TOPICS = [
    ("frontend-platform", "Nền tảng React, router, dependency và build"),
    ("frontend-components", "Thành phần dùng chung, giao diện và tài nguyên"),
    ("frontend-utilities", "Tiện ích dữ liệu, ngày, tiền và bản nháp"),
    ("frontend-i18n", "Ngôn ngữ, bản dịch và công cụ kiểm tra i18n"),
    ("frontend-marketing", "Website giới thiệu và trang thông tin"),
    ("frontend-auth-users", "Đăng nhập và quản lý người dùng khách sạn"),
    ("frontend-pms-shell", "PMS provider, API client, layout và điều hướng"),
    ("frontend-dashboard-rooms", "Dashboard, phòng và sơ đồ phòng"),
    ("frontend-reservations", "Danh sách, tạo booking và các hàm hỗ trợ"),
    ("frontend-booking-detail", "Chi tiết booking, tab và thay đổi lưu trú"),
    ("frontend-rates", "Giá, tồn phòng, ARI và khuyến mãi"),
    ("frontend-finance", "POS, sổ quỹ và hoa hồng"),
    ("frontend-reports", "Báo cáo, đối soát và chốt ngày"),
    ("frontend-housekeeping", "Buồng phòng, phân công và kế hoạch dọn"),
    ("frontend-inventory", "Giao diện kho và chứng từ"),
    ("frontend-settings", "Cấu hình khách sạn và danh mục"),
    ("frontend-owner-profile", "Hồ sơ và thuê bao của chủ khách sạn"),
    ("frontend-channel-core", "Logic và trình bày tích hợp OTA"),
    ("frontend-channel-pages", "Màn hình mapping, onboarding và lịch sử OTA"),
    ("frontend-manager-shell", "Layout và Dashboard quản trị nền tảng"),
    ("frontend-manager-admin", "Quản trị tenant, tài khoản, tính năng và nhật ký"),
    ("frontend-manager-billing", "Quản trị gói, gia hạn và billing"),
    ("frontend-manager-channel", "Logic biểu mẫu và dữ liệu Channex quản trị"),
    ("frontend-final-assembly", "Màn hình Channex quản trị, công cụ và hướng dẫn"),
]

DENIED_PARTS = {
    ".git", "workflow-repo", "node_modules", ".venv", "venv", "__pycache__",
    "dist", "dist-ssr", ".pytest_cache", ".ruff_cache", ".mypy_cache",
    ".local-postgres", ".playwright-cli", "logs", "dumps", "db",
}
DENIED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db", ".dump", ".bak", ".log", ".pyc", ".pyo"}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", "-C", str(REPO), *args])


def safe_path(value: str) -> bool:
    p = PurePosixPath(value)
    return bool(
        value and "\\" not in value and ":" not in value and not p.is_absolute()
        and all(part not in {"", ".", ".."} for part in value.split("/"))
        and not any(part.lower() in DENIED_PARTS for part in p.parts)
        and p.suffix.lower() not in DENIED_SUFFIXES
        and not (p.name.startswith(".env") and p.name != ".env.example")
        and p.name not in {"id_rsa", "id_ed25519"}
    )


def no_links(path: Path, boundary: Path) -> None:
    for item in (path, *path.parents):
        if item == boundary.parent:
            break
        if item.is_symlink() or (hasattr(item, "is_junction") and item.is_junction()):
            raise ValueError(f"Không đi theo symlink/junction: {item.name}")


def loc_day(path: str) -> int:
    if path.startswith("backend/migrations/") or path.startswith("backend/scripts/"):
        return 23
    if path.startswith("backend/tests/"):
        name = PurePosixPath(path).stem.removeprefix("test_")
        matches = [
            (22, ("commissions",)),
            (21, ("closed_finance",)),
            (20, ("manager_billing", "plan_room_limits", "subscription_acceptance")),
            (19, ("notifications", "channel_notifications")),
            (18, ("channex_airbnb", "channex_channels", "channex_insights")),
            (17, ("channex_remote", "tenant_remote_channels")),
            (16, ("manager_features",)),
            (15, ("manager_customers", "manager_users", "manager_profile")),
            (13, ("channel_webhooks", "channels_integration")),
            (12, ("channel_pacing", "channel_mapping_lifecycle")),
            (11, ("channels_client", "channel_credentials", "channel_source", "channel_catalog")),
            (10, ("pricing_",)), (9, ("inventory_",)), (8, ("reports_",)),
            (7, ("housekeeping_",)), (6, ("finance_", "cashbook_")),
            (5, ("booking_integration", "booking_no_show", "booking_client_acceptance")),
            (4, ("booking_values",)),
            (3, ("catalog_", "client_settings", "room_guest_")),
            (2, ("identity", "client_profile")),
            (23, ("pms_workflows", "postgres_integration")),
        ]
        for day, prefixes in matches:
            if name.startswith(prefixes):
                return day
        if name.startswith(("channel", "channex")):
            return 14
        return 1
    if path.startswith(("backend/common/", "backend/pms_api/adapters/")):
        return 1
    if path.startswith("backend/pms_api/"):
        rel = path.removeprefix("backend/pms_api/")
        module = rel.split("/")[0]
        stem = PurePosixPath(rel).stem
        if module == "auth":
            return 2
        if module == "catalog":
            return 3
        if module == "bookings":
            if stem.startswith("stay_changes"):
                return 22
            return 4 if stem in {"domain", "models", "ports", "repository"} else 5
        if module == "finance":
            return 22 if stem.startswith("commissions") else 6
        direct = {"housekeeping": 7, "reports": 8, "inventory": 9, "pricing": 10,
                  "saas_billing": 20, "reconciliation": 21}
        if module in direct:
            return direct[module]
        if module == "channels":
            if stem in {"__init__", "access", "client", "credentials", "domain", "errors", "factory", "identifiers", "models", "ports", "repository"}:
                return 11
            if stem in {"application", "policies", "preview", "preview_application", "publication", "routes", "service", "urls"}:
                return 12
            if stem in {"importer", "onboarding", "workflows"}:
                return 13
            return 14
        if module == "admin":
            if stem.startswith(("channex_airbnb", "channex_channels", "channex_insights")):
                return 18
            if stem.startswith("channex"):
                return 17
            if "feature" in stem:
                return 16
            return 15
        if stem in {"security", "rls", "core_models"}:
            return 2
        if stem in {"currencies", "validation"}:
            return 3
        if stem.startswith("notification"):
            return 19
        if stem in {"subscriptions", "plan_pricing"}:
            return 20
        if stem in {"__init__", "config", "extensions"}:
            return 0
        return 1
    if path.startswith("backend/"):
        return 23 if path.endswith(".md") else 0
    return 0 if path in {".gitignore", "start_backend.bat"} else 23


def thuc_day(path: str) -> int:
    if path == "start_frontend.bat":
        return 0
    rel = path.removeprefix("frontend/")
    if rel == "README.md":
        return 23
    if rel.startswith("scripts/"):
        return 3 if PurePosixPath(rel).name in {"audit-i18n.mjs", "generate-legacy-translations.mjs"} else 23
    if rel.startswith(("public/", "src/assets/", "src/shared/components/", "src/shared/styles/")) or rel == "src/index.css":
        return 1
    if rel.startswith("src/shared/i18n/"):
        return 3
    if rel.startswith("src/shared/"):
        return 2
    if rel.startswith("src/apps/marketing/"):
        return 4
    if rel.startswith("src/apps/pms/"):
        part = rel.removeprefix("src/apps/pms/")
        group = part.split("/")[0]
        direct = {"auth": 5, "user-management": 5, "data": 6, "components": 6,
                  "layouts": 6, "dashboard": 7, "rooms": 7, "rates-inventory": 10,
                  "finance": 11, "reports": 12, "reconciliation": 12,
                  "housekeeping": 13, "inventory": 14, "settings": 15, "profile": 16}
        if group in direct:
            return direct[group]
        if group == "reservations":
            return 9 if part.startswith("reservations/components/") and not PurePosixPath(part).name.startswith("BookingModal") else 8
        if group == "channel-manager":
            return 18 if part.startswith("channel-manager/pages/") else 17
        raise ValueError(f"Chưa phân nhóm frontend PMS: {path}")
    if rel.startswith("src/apps/manager/"):
        part = rel.removeprefix("src/apps/manager/")
        group = part.split("/")[0]
        if group in {"layouts", "components", "dashboard", "theme.js", "mockData.js"}:
            return 19
        if group in {"tenants", "users", "profile", "logs", "features"}:
            return 20
        if group == "billing":
            return 21
        if group == "channex":
            return 23 if part.startswith(("channex/components/", "channex/pages/")) else 22
        raise ValueError(f"Chưa phân nhóm frontend Manager: {path}")
    return 0


def choose_sources():
    tracked = [p for p in git("ls-files", "-z").decode("utf-8").split("\0") if p]
    selected, excluded = set(), []
    for path in tracked:
        if not safe_path(path):
            excluded.append({"path": path, "reason": "Runtime, generated output, sensitive path or unsafe path"})
            continue
        p = PurePosixPath(path)
        include = path.startswith(("backend/", "frontend/"))
        include |= path in {".gitignore", "start_backend.bat", "start_frontend.bat"}
        include |= len(p.parts) == 1 and p.suffix == ".md"
        include |= path.startswith("docs/") and (p.suffix == ".md" or path.endswith(".drawio.xml"))
        include |= path.startswith("tasks/") and p.suffix == ".md"
        if include:
            selected.add(path)
        else:
            excluded.append({"path": path, "reason": "Outside application source and selected handoff documentation"})
    # Explicitly include the documents created in the preceding task, even if
    # the parent's *.md ignore rule hides their editable source files.
    report = REPO / "docs/bao-cao-tien-do/pms-ai"
    if report.is_dir():
        for p in report.rglob("*"):
            if p.is_file():
                rel = p.relative_to(REPO).as_posix()
                if safe_path(rel) and p.suffix.lower() in {".md", ".docx", ".png", ".py", ".ps1"}:
                    selected.add(rel)
    if not selected:
        raise ValueError("Không tìm thấy source để bàn giao")
    for path in sorted(selected):
        no_links(REPO / path, REPO)
        if not (REPO / path).is_file():
            raise ValueError(f"File nguồn không tồn tại: {path}")
    return sorted(selected), [x for x in excluded if x["path"] not in selected]


def write(path: Path, content: str):
    no_links(path, BASE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8", newline="\n")


def write_json(path: Path, content):
    write(path, json.dumps(content, ensure_ascii=False, indent=2) + "\n")


def is_implementation(path: str, side: str) -> bool:
    p = PurePosixPath(path)
    if side == "backend":
        return path.startswith("backend/") and p.suffix == ".py" and "/tests/" not in path and p.name != "__init__.py"
    return path.startswith("frontend/") and p.suffix in {".js", ".jsx", ".mjs"} and ".test." not in p.name


def split_side(records, side, day):
    """Keep same-name implementation/style/test files in one handoff unit.

    Seed both people with implementation code, then balance remaining units by
    bytes. This partitions an existing snapshot; it does not invent revisions.
    """
    units = {}
    for item in records:
        p = PurePosixPath(item["path"])
        stem = re.sub(r"\.test$", "", p.stem)
        if p.name in {"package.json", "package-lock.json", ".npmrc"}:
            key = "frontend/toolchain"
        else:
            key = str(p.parent / stem)
        units.setdefault(key, []).append(item)
    sizes = {key: sum(item["size"] for item in group) for key, group in units.items()}
    implementations = sorted((key for key, group in units.items() if any(is_implementation(item["path"], side) for item in group)), key=lambda key: (-sizes[key], key))
    if len(implementations) < 2:
        raise ValueError(f"Ngày {day + 1} chưa đủ hai đơn vị mã {side} cho hai người")
    order = ("Thuc", "Loc") if day % 2 else ("Loc", "Thuc")
    assigned = {"Loc": [], "Thuc": []}
    totals = {"Loc": 0, "Thuc": 0}
    seeds = implementations[:2]
    for owner, key in zip(order, seeds):
        assigned[owner].extend(units[key])
        totals[owner] += sizes[key]
    for key in sorted((key for key in units if key not in seeds), key=lambda key: (-sizes[key], key)):
        owner = min(order, key=lambda who: totals[who])
        assigned[owner].extend(units[key])
        totals[owner] += sizes[key]
    return assigned


def instructions(pkg, count):
    name, branch = pkg["folder"], pkg["branch"]
    return f"""# Bàn giao {pkg['date']} — {pkg['pusher']}

**Công việc:** {pkg['title']}  
**Backend:** {pkg['backend_topic']} ({pkg['backend_count']} file)  
**Frontend:** {pkg['frontend_topic']} ({pkg['frontend_count']} file)  
**Nhánh:** `{branch}`  
**Commit message:** `{pkg['commit_message']}`  
**Số file:** {count}  
**Gói trước cần ghép:** {', '.join(pkg['depends_on']) or 'Không có; khởi tạo từ repo đích đã thống nhất.'}

## Copy/paste

1. Đồng bộ `main` của repo đích; merge cả hai gói ngày trước trong `LICH_PUSH.csv`. Hai người có thể tạo nhánh của cùng ngày từ cùng mốc main; file của hai gói không trùng nhau.
2. Tạo nhánh bên dưới. Copy **nội dung bên trong `source/`** vào **thư mục gốc repo đích**. Chọn Replace/Overwrite nếu file đã tồn tại; thêm file mới nếu chưa có.
3. Giữ nguyên các đường dẫn `backend/`, `frontend/`, `docs/`… Không copy folder `{name}`, `source`, `manifest.json` hoặc hướng dẫn vào mã ứng dụng.
4. Kiểm tra đúng danh sách `files.txt`, stage và commit bằng tài khoản Git của chính người thực hiện. Mở hai PR của ngày, merge cả hai trước khi chuyển ngày tiếp theo.

## Tạo nhánh trước khi copy

Thay hai đường dẫn mẫu theo máy. Chạy lệnh tạo nhánh **trước khi copy**; chỉ tiếp tục nếu working tree sạch và index không có file từ việc khác.

```powershell
$ErrorActionPreference = 'Stop'
Set-Location 'D:\\duong-dan\\repo-dich'
$TrangThai = git status --porcelain
if ($LASTEXITCODE -ne 0) {{ throw 'Không đọc được trạng thái repo đích.' }}
if ($TrangThai) {{ throw 'Repo đích còn thay đổi; xử lý trước khi tạo nhánh.' }}
git switch main
if ($LASTEXITCODE -ne 0) {{ throw 'Không chuyển được về main; dừng.' }}
git pull --ff-only origin main
if ($LASTEXITCODE -ne 0) {{ throw 'Không cập nhật được main; dừng.' }}
git switch -c {branch}
if ($LASTEXITCODE -ne 0) {{ throw 'Không tạo được nhánh; dừng trước khi copy.' }}
```

Sau khi block trên chạy thành công, **copy nội dung `source/` vào gốc repo đích**, rồi chạy block dưới. Giữ bộ workflow bên ngoài repo đích để không làm working tree bị bẩn bởi các folder bàn giao.

## Stage, commit và push sau khi copy

```powershell
$ErrorActionPreference = 'Stop'
$NhanhHienTai = git branch --show-current
if ($LASTEXITCODE -ne 0 -or $NhanhHienTai -ne '{branch}') {{ throw 'Sai nhánh làm việc; dừng commit.' }}
$DanhSach = 'D:\\duong-dan\\workflow-repo\\{name}\\files.txt'
git add -f --pathspec-from-file=$DanhSach
if ($LASTEXITCODE -ne 0) {{ throw 'Stage chưa đầy đủ; kiểm tra trước khi tiếp tục.' }}
git diff --cached --stat
if ($LASTEXITCODE -ne 0) {{ throw 'Không đọc được staged diff.' }}
git diff --cached --name-status
if ($LASTEXITCODE -ne 0) {{ throw 'Không đọc được danh sách staged.' }}
git diff --cached --check
if ($LASTEXITCODE -ne 0) {{ throw 'Staged diff cần được kiểm tra/sửa trước khi commit.' }}
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {{
    Write-Host 'Không có thay đổi mới; không tạo commit rỗng.'
}} elseif ($LASTEXITCODE -eq 1) {{
    git commit -m "{pkg['commit_message']}"
    if ($LASTEXITCODE -ne 0) {{ throw 'Commit thất bại; chưa push.' }}
    git push -u origin {branch}
    if ($LASTEXITCODE -ne 0) {{ throw 'Push chưa thành công; kiểm tra kết nối/quyền, không force-push.' }}
}} else {{
    throw 'Không kiểm tra được staged diff; dừng commit.'
}}
```

`git add -f` chỉ áp dụng các đường dẫn trong `files.txt` đã kiểm tra, vì repo hiện có rule bỏ qua Markdown và backend/tests. Không dùng `git add .` cho việc bàn giao này. Các lệnh là hướng dẫn để người phụ trách thực hiện; bộ công cụ không tự commit hoặc push.

## Điều kiện kiểm tra

Đây là lát bàn giao từ cùng snapshot, không phải bản triển khai mới trong ngày. Mọi gói đang ở trạng thái chuẩn bị, chưa xác nhận đã push. Cả hai người đều có mã backend và frontend; file cùng tên cơ sở như JSX/CSS/test được giữ thành đơn vị, không ghi đè phần của người còn lại. Các gói riêng có import chéo và chưa bảo đảm khởi chạy độc lập; schema/migration đầy đủ cần cả hai gói ngày 01/12. Không chạy migration hay triển khai trên dữ liệu thật từ một phần source.

Chạy `python -X utf8 workflow-repo/kiem_tra_goi.py` ở thư mục chứa bộ bàn giao để kiểm tra file/hash. Khi đủ source, dùng các bước kiểm thử ở README gốc bộ bàn giao. Gói này chỉ thêm/ghi đè file, không có thao tác xóa; file cũ ngoài danh sách vẫn còn trong repo đích.
"""


def main():
    if REPO.name == "workflow-repo" or not (REPO / ".git").exists():
        raise ValueError("Đặt workflow-repo ngay trong thư mục gốc Git của PMS")
    selected, excluded = choose_sources()
    commit = git("rev-parse", "HEAD").decode().strip()
    status = git("status", "--porcelain=v1", "-z", "--", "backend", "frontend", "docs", "tasks", ".gitignore", "start_backend.bat", "start_frontend.bat")
    captured = datetime.now(timezone.utc).isoformat(timespec="seconds")
    sides = {(day, side): [] for day in range(24) for side in ("backend", "frontend")}
    all_files = []
    for path in selected:
        side = "frontend" if path.startswith("frontend/") or path == "start_frontend.bat" else "backend"
        day = thuc_day(path) if side == "frontend" else loc_day(path)
        data = (REPO / path).read_bytes()
        record = {"path": path, "sha256": sha(data), "size": len(data)}
        all_files.append(record)
        sides[day, side].append(record)
    buckets = {(day, owner): [] for day in range(24) for owner in ("Loc", "Thuc")}
    for (day, side), records in sides.items():
        for owner, files in split_side(records, side, day).items():
            buckets[day, owner].extend(files)
    for files in buckets.values():
        files.sort(key=lambda item: item["path"])
    empty = [f"{day}:{owner}" for (day, owner), files in buckets.items() if not files]
    if empty:
        raise ValueError("Gói chưa có source: " + ", ".join(empty))
    plans, previous_day = [], []
    for day in range((END - START).days + 1):
        when = START + timedelta(days=day)
        today = []
        for owner in ("Loc", "Thuc"):
            backend_title, frontend_title = BACKEND_TOPICS[day][1], FRONTEND_TOPICS[day][1]
            title = backend_title + " + " + frontend_title
            folder = f"{when:%d_%m_%Y}_{owner}"
            files = buckets[day, owner]
            pkg = {"date": when.isoformat(), "pusher": owner, "folder": folder,
                   "title": title, "branch": f"work/{when:%Y-%m-%d}-{owner.lower()}-fullstack-{day + 1:02d}",
                   "backend_topic": backend_title, "frontend_topic": frontend_title,
                   "backend_count": sum(x["path"].startswith("backend/") for x in files),
                   "frontend_count": sum(x["path"].startswith("frontend/") for x in files),
                   "commit_message": f"feat(fullstack): ban giao {when:%d/%m/%Y} - {owner}",
                   "depends_on": previous_day.copy(), "source_commit": commit,
                   "created_at": captured, "status": "prepared_not_pushed",
                   "file_count": len(files), "bytes": sum(x["size"] for x in files),
                   "operation": "upsert_only", "deletions": [], "files": files}
            package_dir = BASE / folder
            no_links(package_dir, BASE)
            existing = package_dir / "source"
            if existing.exists():
                expected = {x["path"] for x in files}
                extras = {p.relative_to(existing).as_posix() for p in existing.rglob("*") if p.is_file()} - expected
                if extras:
                    raise ValueError(f"Có file ngoài manifest trong {folder}; không tự xóa")
            for item in files:
                source, dest = REPO / item["path"], package_dir / "source" / item["path"]
                no_links(dest, BASE)
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, dest)
                if sha(dest.read_bytes()) != item["sha256"]:
                    raise ValueError(f"Source thay đổi trong lúc tạo gói: {item['path']}")
            write(package_dir / "files.txt", "".join(x["path"] + "\n" for x in files))
            write_json(package_dir / "manifest.json", pkg)
            write(package_dir / "HUONG_DAN.md", instructions(pkg, len(files)))
            plans.append({k: v for k, v in pkg.items() if k != "files"})
            today.append(folder)
        previous_day = today
    write_json(BASE / "snapshot.json", {
        "source_commit": commit, "created_at": captured,
        "source_state": "working_tree_modified" if status else "tracked_paths_clean",
        "description": "Existing workspace snapshot partitioned for planned handoff; not daily development history",
        "selection_policy": "Tracked backend/frontend and selected documentation; explicit PMS-AI report files; runtime/private/generated artifacts excluded",
        "file_count": len(all_files), "files": all_files, "excluded": excluded,
    })
    write_json(BASE / "plan.json", {"start_date": START.isoformat(), "end_date": END.isoformat(),
                                   "owners": {"Loc": "backend + frontend song song", "Thuc": "backend + frontend song song"},
                                   "partition_policy": "Same-basename source/style/tests grouped, both owners seeded with implementation code on both sides, remaining units balanced by bytes; no duplicated paths",
                                   "packages": plans})
    no_links(BASE / "LICH_PUSH.csv", BASE)
    with (BASE / "LICH_PUSH.csv").open("w", encoding="utf-8-sig", newline="") as f:
        cols = ["date", "pusher", "folder", "backend_topic", "frontend_topic", "branch", "backend_count", "frontend_count", "file_count", "bytes", "depends_on", "status"]
        writer = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({**p, "depends_on": "; ".join(p["depends_on"])} for p in plans)
    lines = ["# Lịch bàn giao source theo ngày\n", "Trạng thái tất cả gói: **đã chuẩn bị, chưa xác nhận đã push**. Thuc và Loc cùng làm backend + frontend mỗi ngày; hai nhánh cùng ngày có thể song song, merge cả hai trước ngày tiếp theo.\n",
             "| Ngày | Người phụ trách | Gói source | Backend | Frontend | Tổng file |", "| --- | --- | --- | ---: | ---: | ---: |"]
    for p in plans:
        when = date.fromisoformat(p["date"])
        lines.append(f"| {when:%d/%m/%Y} | {p['pusher']} | [{p['folder']}]({p['folder']}/HUONG_DAN.md) | {p['backend_count']} | {p['frontend_count']} | {p['file_count']} |")
    write(BASE / "LICH_PUSH.md", "\n".join(lines) + "\n")
    print(f"Đã tạo {len(plans)} gói, {len(all_files)} file nguồn, {sum(x['size'] for x in all_files):,} byte; snapshot {commit[:12]}.")
    print("Không tạo nhánh, stage, commit, push, xóa file hoặc chạy mã ứng dụng.")


if __name__ == "__main__":
    main()
