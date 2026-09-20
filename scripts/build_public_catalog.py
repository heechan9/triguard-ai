"""Build a standalone civilian metadata catalog; never import operational modules."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public-data-demo'
PREFIXES = ('질병관리청_', '행정안전부_')
ASSETS = ('index.html', 'styles.css', 'app.js', 'vercel.json')


def catalog():
    rows = []
    for path in sorted((ROOT / 'data').glob('*.csv')):
        if not path.name.startswith(PREFIXES):
            continue
        raw = path.read_bytes()
        rows.append({'file': path.name, 'publisher': path.name.split('_')[0],
                     'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
                     'source_status': '파일명 기반 기관 표시 · 개별 원문 URL 미확인',
                     'freshness': '최신성 미검증'})
    return {'schema_version': 1, 'source_commit': subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'scope': 'Civilian public-health and population file metadata only',
        'files': rows}


def main():
    OUT.mkdir(exist_ok=True)
    for name in ASSETS:
        shutil.copyfile(ROOT / 'public-demo-src' / name, OUT / name)
    (OUT / 'catalog.json').write_text(json.dumps(catalog(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    actual = {p.name for p in OUT.iterdir()}
    if actual != set(ASSETS) | {'catalog.json'}:
        raise ValueError('Unexpected deploy files; inspect output before deployment')


if __name__ == '__main__':
    main()
