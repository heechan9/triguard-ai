"""Descriptive agency snapshots: no operational scoring or recommendations."""
import csv
import hashlib
import io
from collections import Counter
from pathlib import Path

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
        if not path.name.startswith(('방위사업청', '질병관리청')):
            continue
        raw, rows = read_rows(path)
        source_rows = len(rows)
        item = {'source': path.name, 'sha256': hashlib.sha256(raw).hexdigest()}
        if path.name.startswith('방위사업청'):
            header, records = rows[0], rows[1:]
            source_rows = len(records)
            if '계약체결방법명' in header:
                index = header.index('계약체결방법명')
                counts = Counter(r[index] or '기재 없음' for r in records)
                item.update(columns=['계약체결방법명', '원자료 행 수'], rows=[[k, str(v)] for k, v in sorted(counts.items())])
            else:
                index = header.index('업체명')
                companies = {r[index].strip() for r in records if r[index].strip()}
                item.update(columns=['집계 항목', '수치'], rows=[['원자료 행 수', str(len(records))], ['서로 다른 업체명 수', str(len(companies))]])
            item['note'] = '공개 CSV의 기록 집계입니다. 변경 계약·반복 참여가 포함될 수 있어 행 수는 고유 계약·업체 수와 다릅니다. 파일명 날짜는 자료 내부의 계약기간을 의미하지 않습니다. 개인 이름과 개별 계약 내용은 표시하지 않습니다.'
        else:
            width = max(map(len, rows))
            item.update(columns=[f'원자료 {i+1}열' for i in range(width)], rows=[r + ['']*(width-len(r)) for r in rows])
            item['note'] = '이 CSV에는 열 제목이 없습니다. 첫 행도 자료로 보존했습니다. 항목명·단위·기간 구분은 미확인이므로 원자료 열 번호와 값을 그대로 표시합니다. 빈 셀은 자료 없음이며 0과 구분합니다. 서로 다른 열을 합산하지 않습니다.'
        item['source_rows'] = source_rows
        datasets.append(item)
    if len(datasets) != 7:
        raise ValueError(f'Expected 7 agency sources, got {len(datasets)}')
    return {'datasets': datasets, 'scope': '공개 원자료 조회 및 기록 집계'}
