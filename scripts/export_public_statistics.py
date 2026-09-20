"""Export descriptive public statistics without operational scores or recommendations."""
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = '병무청_병역판정검사 현황_20251231.csv'


def build():
    raw = (ROOT / 'data' / SOURCE).read_bytes()
    for encoding in ('utf-8-sig', 'cp949'):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError('Unsupported source encoding')
    reader = csv.DictReader(io.StringIO(text))
    rows = []
    for record in reader:
        record = {k.strip(): v.strip() for k, v in record.items()}
        rows.append({
            'year': int(record['연도']),
            'office': record['지방청'].replace('.', ''),
            'values': {key: int(record[key].replace(',', '')) for key in
                       ('처분인원', '현역', '보충역', '전시근로역', '병역면제', '재신체검사')},
        })
    return {'source': SOURCE, 'source_sha256': hashlib.sha256(raw).hexdigest(),
            'date_note': '파일명 기준 2025-12-31 · 공식 기준일 별도 확인 필요',
            'unit': '명', 'rows': rows}


if __name__ == '__main__':
    output = ROOT / 'public-statistics' / 'data' / 'statistics.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
    print(output.relative_to(ROOT))
