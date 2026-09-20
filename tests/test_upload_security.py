import io
import unittest

from modules.upload_security import read_csv_upload


class UploadSecurityTests(unittest.TestCase):
    def test_text_encodings(self):
        for encoding in ("utf-8-sig", "cp949"):
            with self.subTest(encoding=encoding):
                raw = "name,value\n예시,1\n".encode(encoding)
                self.assertEqual(read_csv_upload(io.BytesIO(raw)), raw)

    def test_limit_boundary(self):
        self.assertEqual(read_csv_upload(io.BytesIO(b"a,b\n"), 4), b"a,b\n")
        with self.assertRaises(ValueError):
            read_csv_upload(io.BytesIO(b"a,b\nx"), 4)

    def test_empty_inputs(self):
        for raw in (b"", b" \r\n\t", b"\xef\xbb\xbf"):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                read_csv_upload(io.BytesIO(raw))

    def test_binary_inputs(self):
        for raw in (b"a\x00b", b"PK\x03\x04zip", b"PK\x05\x06", b"\x1f\x8bgzip", b"%PDF-1.0"):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                read_csv_upload(io.BytesIO(raw))

    def test_bom_followed_by_whitespace_is_empty(self):
        for suffix in (b" ", b"\r\n", b"\t \r\n"):
            stream = io.BytesIO(b"\xef\xbb\xbf" + suffix)
            with self.subTest(suffix=suffix), self.assertRaises(ValueError):
                read_csv_upload(stream)
            self.assertEqual(stream.tell(), 0)

    def test_bom_content_preserves_bytes_and_size_limit(self):
        raw = b"\xef\xbb\xbfa,b\r\n"
        self.assertEqual(read_csv_upload(io.BytesIO(raw), len(raw)), raw)
        with self.assertRaises(ValueError):
            read_csv_upload(io.BytesIO(raw), len(raw) - 1)

    def test_cursor_reset_on_success_and_rejection(self):
        for raw in (b"a,b\n", b"a\x00b"):
            stream = io.BytesIO(raw)
            stream.seek(1)
            try:
                read_csv_upload(stream)
            except ValueError:
                pass
            self.assertEqual(stream.tell(), 0)

    def test_bounded_read(self):
        class BoundedStream(io.BytesIO):
            def read(self, size=-1):
                self.requested = size
                return super().read(size)
        stream = BoundedStream(b"x" * 100)
        with self.assertRaises(ValueError):
            read_csv_upload(stream, 8)
        self.assertEqual(stream.requested, 9)

    def test_invalid_limit(self):
        for limit in (0, -1, True, 1.5, "10"):
            with self.subTest(limit=limit), self.assertRaises(ValueError):
                read_csv_upload(io.BytesIO(b"a"), limit)

    def test_reject_text_stream(self):
        with self.assertRaises(ValueError):
            read_csv_upload(io.StringIO("a,b"))

    def test_uploaded_name_not_used_as_path(self):
        stream = io.BytesIO(b"a,b\n")
        stream.name = "../../not-a-local-file.csv"
        self.assertEqual(read_csv_upload(stream), b"a,b\n")


if __name__ == "__main__":
    unittest.main()
