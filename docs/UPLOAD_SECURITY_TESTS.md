# General upload security scope

This change tests generic CSV upload resource guards only. It does not validate
military readiness, personnel allocation, risk scores, model quality, or the
correctness of the application's operational recommendations.

Run: `python -m unittest discover -s tests -p 'test_upload_security.py' -v`

The reader caps each raw upload at 10 MiB, uses a bounded read, resets the stream,
rejects empty input and common binary/archive signatures, and does not interpret
uploaded filenames as local paths. The existing upload parser consumes the checked
bytes in memory. UTF-16/32 uploads are not supported by this guard.

Limitations: this is not a complete CSV validator, malware scanner or parser-memory
limit. Streamlit may already have buffered an upload before the guard runs. No
dependency vulnerability scan or deployed browser test is claimed. CI executes
only these general security tests and does not certify the whole application.
