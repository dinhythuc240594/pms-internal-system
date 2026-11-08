"""Kiem tra 48 goi ban giao va thu ghep/ghi de trong thu muc tam.

Chay: python -X utf8 workflow-repo/kiem_tra_goi.py
Chi doc cac goi; khong chay Git, khong thay doi source cua ung dung.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path, PurePosixPath


START = date(2026, 11, 8)
END = date(2026, 12, 1)
PUSHERS = ("Loc", "Thuc")
DENIED_PARTS = {
    ".git", "workflow-repo", "node_modules", ".venv", "venv",
    "__pycache__", "dist", "dist-ssr", ".pytest_cache", ".ruff_cache",
    ".mypy_cache", ".local-postgres", ".playwright-cli", "logs", "dumps", "db",
}
DENIED_SUFFIXES = {
    ".pem", ".key", ".p12", ".pfx", ".sqlite", ".sqlite3", ".db",
    ".dump", ".bak", ".log", ".pyc", ".pyo",
}
DENIED_NAMES = {".flaskenv", "id_rsa", "id_ed25519", "credentials", "credentials.json"}
RESERVED_WINDOWS = {"con", "prn", "aux", "nul"} | {
    f"{prefix}{number}" for prefix in ("com", "lpt") for number in range(1, 10)
}
PACKAGE_NAME = re.compile(r"\d{2}_\d{2}_\d{4}_(?:Loc|Thuc)")


class VerificationError(Exception):
    """Sai cau truc, metadata hoac noi dung goi ban giao."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def no_link(path: Path) -> None:
    is_junction = getattr(path, "is_junction", lambda: False)
    require(not path.is_symlink() and not is_junction(), f"Khong chap nhan symlink/junction: {path}")


def real_path(path: Path, boundary: Path, *, directory: bool = False) -> Path:
    """Kiem tra tung ancestor ma khong resolve va che mat symlink."""
    try:
        relative = path.relative_to(boundary)
    except ValueError as exc:
        raise VerificationError(f"Duong dan vuot thu muc goi: {path}") from exc
    cursor = boundary
    no_link(cursor)
    require(cursor.is_dir(), f"Thieu thu muc goc: {cursor}")
    for part in relative.parts:
        cursor = cursor / part
        no_link(cursor)
    require(path.is_dir() if directory else path.is_file(), f"Thieu {'thu muc' if directory else 'file'}: {path}")
    return path


def safe_relative(value: object, context: str) -> str:
    require(isinstance(value, str) and bool(value), f"{context}: path phai la chuoi khong rong")
    require(not any(char in value for char in ("\\", ":", "\x00", "\n", "\r")), f"{context}: duong dan khong an toan")
    parts = value.split("/")
    require(all(part and part not in {".", ".."} for part in parts), f"{context}: duong dan phai tuong doi va khong co dot segment")
    require(not PurePosixPath(value).is_absolute(), f"{context}: khong chap nhan duong dan tuyet doi")
    for part in parts:
        lowered = part.casefold()
        require(lowered not in DENIED_PARTS, f"{context}: thu muc bi loai tru: {part}")
        require(part == part.rstrip(" ."), f"{context}: duong dan co trailing dot/space")
        require(lowered.split(".", 1)[0] not in RESERVED_WINDOWS, f"{context}: ten file Windows khong hop le: {part}")
    basename = parts[-1].casefold()
    require(basename not in DENIED_NAMES, f"{context}: ten file nhay cam: {basename}")
    require(not (basename == ".env" or basename.startswith(".env.")) or basename == ".env.example", f"{context}: chi cho phep .env.example")
    require(PurePosixPath(basename).suffix not in DENIED_SUFFIXES, f"{context}: phan mo rong bi loai tru: {basename}")
    return value


def read_json(path: Path, boundary: Path) -> dict:
    real_path(path, boundary)
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (UnicodeError, json.JSONDecodeError) as exc:
        raise VerificationError(f"JSON/UTF-8 khong hop le: {path.name}") from exc
    require(isinstance(value, dict), f"{path.name}: can JSON object")
    return value


def file_index(records: object, context: str) -> dict[str, dict]:
    require(isinstance(records, list) and bool(records), f"{context}: files phai la danh sach khong rong")
    result = {}
    case_paths = set()
    for entry in records:
        require(isinstance(entry, dict), f"{context}: moi files entry phai la object")
        relative = safe_relative(entry.get("path"), context)
        require(relative.casefold() not in case_paths, f"{context}: duong dan trung (ke ca hoa/thuong): {relative}")
        sha = entry.get("sha256")
        size = entry.get("size")
        require(isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{64}", sha) is not None, f"{context}: SHA-256 khong hop le: {relative}")
        require(type(size) is int and size >= 0, f"{context}: size khong hop le: {relative}")
        result[relative] = entry
        case_paths.add(relative.casefold())
    return result


def scan_files(directory: Path, boundary: Path) -> dict[str, Path]:
    real_path(directory, boundary, directory=True)
    result = {}

    def walk_error(exc: OSError) -> None:
        raise VerificationError(f"Khong doc duoc thu muc: {exc.filename}") from exc

    for current, directories, files in os.walk(directory, followlinks=False, onerror=walk_error):
        parent = Path(current)
        for name in directories:
            real_path(parent / name, boundary, directory=True)
        for name in files:
            path = real_path(parent / name, boundary)
            relative = path.relative_to(directory).as_posix()
            safe_relative(relative, directory.name)
            result[relative] = path
    return result


def check_bytes(path: Path, entry: dict, context: str) -> None:
    require(path.stat().st_size == entry["size"], f"{context}: sai kich thuoc: {entry['path']}")
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    require(digest.hexdigest() == entry["sha256"], f"{context}: SHA-256 khong khop: {entry['path']}")


def compare_paths(actual: set[str], expected: set[str], context: str) -> None:
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    require(not missing and not extra, f"{context}: thieu {len(missing)} file, thua {len(extra)} file; dau tien: {next(iter(missing or extra), '-')}")


def is_test_path(relative: str) -> bool:
    path = PurePosixPath(relative)
    return (
        any(part.casefold() in {"tests", "__tests__", "fixtures"} for part in path.parts)
        or path.name.startswith("test_")
        or ".test." in path.name
        or ".spec." in path.name
    )


def check_fullstack(entries: dict[str, dict], manifest: dict, context: str) -> None:
    backend = [path for path in entries if path.startswith("backend/")]
    frontend = [path for path in entries if path.startswith("frontend/")]
    require(
        type(manifest.get("backend_count")) is int and manifest["backend_count"] == len(backend),
        f"{context}: backend_count khong khop danh sach file",
    )
    require(
        type(manifest.get("frontend_count")) is int and manifest["frontend_count"] == len(frontend),
        f"{context}: frontend_count khong khop danh sach file",
    )
    for field in ("backend_topic", "frontend_topic"):
        require(isinstance(manifest.get(field), str) and bool(manifest[field].strip()), f"{context}: thieu {field}")
    require(
        any(path.endswith(".py") and not is_test_path(path) for path in backend),
        f"{context}: can it nhat mot file Python backend khong phai test",
    )
    require(
        any(PurePosixPath(path).suffix in {".js", ".jsx", ".mjs"} and not is_test_path(path) for path in frontend),
        f"{context}: can it nhat mot file JavaScript frontend khong phai test",
    )


def verify(base: Path) -> tuple[int, int, int]:
    # Base itself and its ancestors must not redirect the verifier elsewhere.
    for ancestor in (base, *base.parents):
        no_link(ancestor)
    snapshot = read_json(base / "snapshot.json", base)
    commit = snapshot.get("source_commit")
    require(isinstance(commit, str) and bool(commit.strip()), "snapshot.json: thieu source_commit")
    require(isinstance(snapshot.get("created_at"), str) and bool(snapshot["created_at"]), "snapshot.json: thieu created_at")
    expected = file_index(snapshot.get("files"), "snapshot.json")
    require(isinstance(snapshot.get("excluded"), list), "snapshot.json: thieu danh sach excluded")

    days = [START + timedelta(days=index) for index in range((END - START).days + 1)]
    expected_packages = {f"{day:%d_%m_%Y}_{pusher}" for day in days for pusher in PUSHERS}
    actual_packages = {path.name for path in base.iterdir() if PACKAGE_NAME.fullmatch(path.name)}
    compare_paths(actual_packages, expected_packages, "Danh sach 48 folder ngay/nguoi")
    originals = {}
    assigned_case_paths = set()
    branches = set()

    for day in days:
        for pusher in PUSHERS:
            package_name = f"{day:%d_%m_%Y}_{pusher}"
            package = real_path(base / package_name, base, directory=True)
            manifest = read_json(package / "manifest.json", base)
            require(manifest.get("date") == day.isoformat(), f"{package_name}: date khong khop")
            require(manifest.get("pusher") == pusher, f"{package_name}: pusher khong khop")
            require(manifest.get("source_commit") == commit, f"{package_name}: source_commit khong khop snapshot")
            branch = manifest.get("branch")
            require(isinstance(branch, str) and branch.strip() == branch and bool(branch), f"{package_name}: thieu branch")
            require(branch not in branches, f"{package_name}: ten branch trung")
            branches.add(branch)
            entries = file_index(manifest.get("files"), package_name)
            check_fullstack(entries, manifest, package_name)
            dependencies = manifest.get("depends_on")
            require(isinstance(dependencies, list) and all(isinstance(item, str) for item in dependencies), f"{package_name}: depends_on phai la danh sach ten goi")
            require(len(dependencies) == len(set(dependencies)), f"{package_name}: depends_on trung lap")
            previous_day = day - timedelta(days=1)
            expected_dependencies = (
                {f"{previous_day:%d_%m_%Y}_{owner}" for owner in PUSHERS}
                if day > START else set()
            )
            compare_paths(set(dependencies), expected_dependencies, f"{package_name}/depends_on")
            paths_file = real_path(package / "files.txt", base)
            try:
                paths = paths_file.read_text(encoding="utf-8-sig").splitlines()
            except UnicodeError as exc:
                raise VerificationError(f"{package_name}/files.txt: khong phai UTF-8") from exc
            require(len(paths) == len(set(paths)), f"{package_name}/files.txt: duong dan trung")
            for path in paths:
                safe_relative(path, f"{package_name}/files.txt")
            compare_paths(set(paths), set(entries), f"{package_name}/files.txt")
            actual = scan_files(package / "source", base)
            compare_paths(set(actual), set(entries), f"{package_name}/source")
            for relative, entry in entries.items():
                require(relative.casefold() not in assigned_case_paths, f"File thuoc nhieu goi: {relative}")
                require(relative in expected, f"{package_name}: file khong thuoc snapshot: {relative}")
                require(entry["sha256"] == expected[relative]["sha256"] and entry["size"] == expected[relative]["size"], f"{package_name}: metadata khac snapshot: {relative}")
                check_bytes(actual[relative], entry, package_name)
                originals[relative] = actual[relative]
                assigned_case_paths.add(relative.casefold())
    compare_paths(set(originals), set(expected), "Tong hop phan chia snapshot")

    with tempfile.TemporaryDirectory(prefix="pms-workflow-check-") as temporary:
        root = Path(temporary)
        reconstructed = root / "reconstructed"
        reconstructed.mkdir()
        for relative, original in originals.items():
            destination = reconstructed.joinpath(*relative.split("/"))
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(original, destination)
        rebuilt = scan_files(reconstructed, reconstructed)
        compare_paths(set(rebuilt), set(expected), "Repo ghep trong thu muc tam")
        for relative, destination in rebuilt.items():
            check_bytes(destination, expected[relative], "Repo ghep")

        # Simulate overwriting existing content, then restore using package bytes.
        relative = next(iter(originals))
        original = originals[relative]
        destination = rebuilt[relative]
        probe = b"pms-workflow-overwrite-probe\n"
        if hashlib.sha256(probe).hexdigest() == expected[relative]["sha256"]:
            probe += b"changed\n"
        destination.write_bytes(probe)
        shutil.copy2(original, destination)
        check_bytes(destination, expected[relative], "Thu copy ghi de")

        # Simulate adding a source file into an empty target tree.
        addition = root.joinpath("new-file-probe", *relative.split("/"))
        require(not addition.exists(), "Thu them moi: dich phai chua ton tai")
        addition.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(original, addition)
        check_bytes(addition, expected[relative], "Thu copy them moi")

    return len(expected_packages), len(expected), sum(entry["size"] for entry in expected.values())


def main() -> int:
    if len(sys.argv) != 1:
        print("Cach chay: python -X utf8 workflow-repo/kiem_tra_goi.py", file=sys.stderr)
        return 2
    try:
        packages, files, size = verify(Path(__file__).absolute().parent)
    except (VerificationError, OSError) as exc:
        print(f"KHONG DAT: {exc}", file=sys.stderr)
        return 1
    print(f"DAT: {packages} goi / 24 ngay / Thuc va Loc; {files} file; {size:,} byte.")
    print("DAT: moi nguoi moi ngay co backend + frontend khong phai test; phu thuoc hai goi ngay truoc.")
    print("DAT: duong dan, source_commit, files.txt, SHA-256, kich thuoc va phan chia duy nhat.")
    print("DAT: ghep repo trong thu muc tam, copy them moi va ghi de; khong thay doi repo ung dung.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
