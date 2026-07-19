"""Shared file upload helpers for chat attachments and LMS materials."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
ALLOWED_EXTENSIONS = {
    "png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx",
    "txt", "zip", "rar", "ppt", "pptx", "xls", "xlsx", "mp4", "mp3", "webm", "mov", "m4v",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


def ensure_upload_dir(subdir: str = "") -> Path:
    target = UPLOAD_DIR / subdir if subdir else UPLOAD_DIR
    target.mkdir(parents=True, exist_ok=True)
    return target


def allowed_filename(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[-1].lower() in ALLOWED_EXTENSIONS


def is_image(filename: str) -> bool:
    return filename.rsplit(".", 1)[-1].lower() in {"png", "jpg", "jpeg", "gif", "webp"}


def is_video(filename: str) -> bool:
    return filename.rsplit(".", 1)[-1].lower() in {"mp4", "webm", "mov", "m4v"}


def delete_upload_file(file_url: str | None) -> None:
    """Best-effort delete of a file previously saved under /uploads/..."""
    if not file_url or not file_url.startswith("/uploads/"):
        return
    rel = file_url[len("/uploads/"):].lstrip("/").replace("\\", "/")
    if ".." in rel.split("/"):
        return
    path = UPLOAD_DIR / rel
    try:
        if path.is_file():
            path.unlink()
    except OSError:
        pass


class UploadError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def save_upload(file: FileStorage, subdir: str = "chat") -> dict:
    """Validate and save an uploaded file. Returns {url, name, type, size}."""
    if not file or not file.filename:
        raise UploadError("Empty filename")
    if not allowed_filename(file.filename):
        raise UploadError(
            "File type not allowed. Use images, video (mp4/webm), PDF, or Office files."
        )

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise UploadError(
            f"File too large (max {mb} MB). Compress the video or send a shorter clip."
        )

    raw_name = file.filename
    original = secure_filename(raw_name) or f"file.{raw_name.rsplit('.', 1)[-1].lower()}"
    ext = original.rsplit(".", 1)[-1].lower()
    stored = f"{uuid.uuid4().hex}.{ext}"

    dest_dir = ensure_upload_dir(subdir)
    dest = dest_dir / stored
    file.save(dest)

    url_prefix = f"/uploads/{subdir}" if subdir else "/uploads"
    url = f"{url_prefix}/{stored}"

    if is_image(original):
        file_type = "image"
    elif is_video(original):
        file_type = "video"
    else:
        file_type = "file"

    return {
        "url": url,
        "name": original,
        "type": file_type,
        "size": size,
    }
