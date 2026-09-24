"""Source contracts and read-only release checks for descriptive public data."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

REPO_URL = 'https://github.com/heechan9/triguard-ai/blob/'

def check_source(name, rows):
    if not rows or any(not isinstance(r, list) for r in rows):
        raise ValueError(f'{name}: empty or invalid source')
    if name.startswith('질병관리청'):
        width = 69 if '통계_지역별' in name else 55 if '인플루엔자' in name else 11 if '급성호흡기' in name else 10
        if max(map(len, rows)) != width or any(not r for r in rows):
            raise ValueError(f'{name}: reviewed headerless column structure changed')
        if '급성호흡기' in name:
            keys = set()
            for r in rows:
                if len(r) != width or not r[0].isdigit() or not r[1].isdigit() or not 1 <= int(r[1]) <= 53:
                    raise ValueError(f'{name}: invalid year/week structure')
                key = (int(r[0]), int(r[1]))
                if key in keys:
                    raise ValueError(f'{name}: duplicate year/week')
                keys.add(key)
                if any(not v.isdigit() for v in r[2:-1]) or r[-1].strip():
                    raise ValueError(f'{name}: invalid count or trailing column')
        return {'structure':'passed', 'metadata':'confirmed' if '급성호흡기' in name else 'pending', 'columns':width}
    header, records = rows[0], rows[1:]
    clean = [v.strip() for v in header]
    if not records or any(not v for v in clean) or len(set(clean)) != len(clean):
        raise ValueError(f'{name}: empty records or duplicate/blank headers')
    if any(len(r) != len(header) for r in records):
        raise ValueError(f'{name}: column count changed')
    if name.startswith('방위사업청'):
        required = ['업체명'] if '입찰참여' in name else ['계약체결방법명']
        if '국내조달 계약' in name:
            required.append('대표업체주소')
        if not set(required) <= set(clean):
            raise ValueError(f'{name}: required procurement columns missing')
    elif name.startswith(('행정안전부', '병무청')):
        keys = [re.sub(r'[\s·]', '', r[0]) for r in records]
        if any(not key for key in keys) or len(keys) != len(set(keys)):
            raise ValueError(f'{name}: empty or duplicate region key')
        for r in records:
            if any(v.strip() and not re.fullmatch(r'(?:\d+|\d{1,3}(?:,\d{3})+)',v.strip()) for v in r[1:]):
                raise ValueError(f'{name}: expected nonnegative integer counts')
        if name.startswith('행정안전부') and not any('2026' in c and '04' in c for c in clean):
            raise ValueError(f'{name}: population period changed; review metadata')
    return {'structure':'passed', 'metadata':'source_fields_only', 'columns':len(header)}

def revision(root):
    value = subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
    if not re.fullmatch(r'[0-9a-f]{40}', value):
        raise ValueError('A full Git revision is required for public source links')
    return value

def pin_links(output, rev):
    for path in output.rglob('*'):
        if path.is_file() and path.suffix in {'.js','.html','.json'}:
            text = path.read_text(encoding='utf-8')
            path.write_text(text.replace(REPO_URL+'main/', REPO_URL+rev+'/'),encoding='utf-8')

def verify_release(output, agencies, rev):
    # Structural equality is independent of the subsequently generated file hashes.
    expected = json.loads(json.dumps(agencies,ensure_ascii=False).replace(REPO_URL+'main/',REPO_URL+rev+'/'))
    actual = json.loads((output/'data/agencies.json').read_text())
    if actual != expected:
        raise ValueError('Release agency data differs from canonical export')
    for path in output.rglob('*'):
        if path.is_file() and path.suffix in {'.js','.html','.json'} and REPO_URL+'main/' in path.read_text():
            raise ValueError(f'Mutable source link in {path.name}')
    files = {}
    for path in sorted(output.rglob('*')):
        if path.is_file() and path.name != 'release_manifest.json':
            raw=path.read_bytes()
            files[path.relative_to(output).as_posix()]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
    return {'schema_version':1,'revision':rev,'files':files,'scope':'배포 파일 식별·원본 내보내기 대조. 공식 최신성·연구 타당성 검증 아님'}
