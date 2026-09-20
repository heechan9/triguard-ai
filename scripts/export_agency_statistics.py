"""Descriptive agency snapshots: no operational scoring or recommendations."""
import csv
import hashlib
import io
from collections import Counter
from pathlib import Path

try:
    from .agency_metadata import supplier_regions, health_metadata
except ImportError:
    from agency_metadata import supplier_regions, health_metadata

ROOT = Path(__file__).resolve().parents[1]

def read_rows(path):
    raw = path.read_bytes()
    for encoding in ('utf-8-sig', 'cp949'):
        try:
            return raw, list(csv.reader(io.StringIO(raw.decode(encoding))))
        except UnicodeDecodeError:
            pass
    raise ValueError(f'Unsupported encoding: {path.name}')

def generate(root=ROOT):
    datasets = []
    for path in sorted((root / 'data').glob('*.csv')):
        if not path.name.startswith(('방위사업청', '질병관리청', '행정안전부', '무역안보관리원', '병무청_현역병 지방청별 입영현황_20241231', '병무청_병역면제자')):
            continue
        raw, rows = read_rows(path)
        source_rows = len(rows)
        item = {'source': path.name, 'sha256': hashlib.sha256(raw).hexdigest()}
        if path.name.startswith('방위사업청'):
            header, records = rows[0], rows[1:]
            source_rows = len(records)
            if '대표업체주소' in header:
                item['supplier_regions'] = supplier_regions(header, records)
            if '계약체결방법명' in header:
                index = header.index('계약체결방법명')
                counts = Counter(r[index] or '기재 없음' for r in records)
                item.update(columns=['계약체결방법명', '원자료 행 수'], rows=[[k, str(v)] for k, v in sorted(counts.items())])
            else:
                index = header.index('업체명')
                companies = {r[index].strip() for r in records if r[index].strip()}
                item.update(columns=['집계 항목', '수치'], rows=[['원자료 행 수', str(len(records))], ['서로 다른 업체명 수', str(len(companies))]])
            item['note'] = '공개 CSV의 기록 집계입니다. 변경 계약·반복 참여가 포함될 수 있어 행 수는 고유 계약·업체 수와 다릅니다. 파일명 날짜는 자료 내부의 계약기간을 의미하지 않습니다. 개인 이름과 개별 계약 내용은 표시하지 않습니다.'
        elif path.name.startswith(('행정안전부', '무역안보관리원', '병무청')):
            header, records = rows[0], rows[1:]
            if any(len(r) != len(header) for r in records):
                raise ValueError(f'Column mismatch: {path.name}')
            item.update(columns=header, rows=records)
            source_rows = len(records)
            item['extra_kind'] = ('population' if path.name.startswith('행정안전부') else 'catalog' if path.name.startswith('무역안보') else 'enlist' if '입영현황' in path.name else 'exempt')
            item['period_note'] = ('2026년 4월 · 원본 열 제목 기준 · 단위 명' if item['extra_kind']=='population' else '파일명 2026-05-22 · 전국 공통 품목 목록 · 지역별 재고 아님' if item['extra_kind']=='catalog' else '파일명 2024-12-31 · 공식 기준일 별도 확인 · 단위 명')
            item['note'] = item['period_note'] + '. 병무청 연도 선택으로 이 자료의 기간은 변경되지 않습니다.'
            if item['extra_kind']=='enlist':
                duplicate = root/'data/병무청_현역병 지방청별 입영현황.csv'
                if duplicate.read_bytes() != raw:
                    raise ValueError('Enlistment duplicate changed; review both sources')
                item['duplicate_source'] = duplicate.name
                item['note'] += ' 날짜 없는 입영현황 CSV와 바이트가 같아 한 번만 표시합니다.'
        else:
            width = max(map(len, rows))
            item.update(columns=[f'원자료 {i+1}열' for i in range(width)], rows=[r + ['']*(width-len(r)) for r in rows])
            item['note'] = '이 CSV에는 열 제목이 없습니다. 첫 행도 자료로 보존했습니다. 항목명·단위·기간 구분은 미확인이므로 원자료 열 번호와 값을 그대로 표시합니다. 빈 셀은 자료 없음이며 0과 구분합니다. 서로 다른 열을 합산하지 않습니다.'
            item['metadata'] = health_metadata(path.name, item['columns'], item['rows'], item['sha256'])
        item['source_rows'] = source_rows
        datasets.append(item)
    if len(datasets) != 11:
        raise ValueError(f'Expected 11 agency sources, got {len(datasets)}')
    return {'datasets': datasets, 'scope': '공개 원자료 조회 및 기록 집계'}
