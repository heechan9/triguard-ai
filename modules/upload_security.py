"""Domain-independent resource guards for untrusted CSV uploads."""

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def read_csv_upload(uploaded_file, max_bytes=MAX_UPLOAD_BYTES):
    """Read at most limit+1 bytes; never use an uploaded name as a path.

    This limits raw input size, not the memory used by a downstream parser.
    UTF-8/CP949-style text is supported; UTF-16/32 and archives are rejected.
    """
    if isinstance(max_bytes, bool) or not isinstance(max_bytes, int) or max_bytes <= 0:
        raise ValueError("Upload limit must be a positive integer")
    try:
        uploaded_file.seek(0)
        raw = uploaded_file.read(max_bytes + 1)
    finally:
        uploaded_file.seek(0)
    if not isinstance(raw, bytes):
        raise ValueError("Upload must provide bytes")
    if len(raw) > max_bytes:
        raise ValueError("CSV 업로드 허용 크기를 초과했습니다.")
    if not raw or not raw.strip() or raw == b"\xef\xbb\xbf":
        raise ValueError("빈 CSV 파일은 업로드할 수 없습니다.")
    if b"\x00" in raw or raw.startswith((b"PK\x03\x04", b"PK\x05\x06", b"\x1f\x8b", b"%PDF-")):
        raise ValueError("압축·바이너리 파일 대신 UTF-8 또는 CP949 CSV를 사용하세요.")
    return raw
