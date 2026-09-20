"""Validate descriptive statistics against the retained source; no operational models."""
import csv
import hashlib
import io
import json
from datetime import datetime, timezone
from pathlib import Path

FIELDS = ('처분인원', '현역', '보충역', '전시근로역', '병역면제', '재신체검사')
OFFICES = {'서울','부산울산','대구경북','경인','광주전남','대전충남','강원','충북','전북','경남','제주','인천','경기북부','강원영동'}
ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(snapshot, raw, downloads):
    require(snapshot.get('unit') == '명', 'UNIT: expected 명')
    require(snapshot.get('source_sha256') == hashlib.sha256(raw).hexdigest(), 'SOURCE_HASH: source changed')
    for encoding in ('utf-8-sig', 'cp949'):
        try:
            text = raw.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError('ENCODING: unsupported source')
    expected = {}
    for record in csv.DictReader(io.StringIO(text)):
        record = {k.strip(): v.strip() for k, v in record.items()}
        key = (int(record['연도']), record['지방청'].replace('.', ''))
        require(key not in expected, f'SOURCE_DUPLICATE: {key}')
        expected[key] = {f: int(record[f].replace(',', '')) for f in FIELDS}
    observed = {}
    for row in snapshot['rows']:
        key = (row['year'], row['office'])
        require(type(row['year']) is int, 'YEAR: integer required')
        require(key not in observed, f'DUPLICATE: {key}')
        require(set(row['values']) == set(FIELDS), f'FIELDS: {key}')
        require(all(type(v) is int and v >= 0 for v in row['values'].values()), f'COUNTS: {key}')
        observed[key] = row['values']
    require(observed == expected, 'SOURCE_VALUES: rows or values differ from original CSV')
    years = sorted({y for y, _ in expected})
    for year in years:
        require({o for y, o in observed if y == year} == OFFICES | {'전체'}, f'COVERAGE: {year}')
        for field in FIELDS:
            require(observed[(year,'전체')][field] == sum(observed[(year,o)][field] for o in OFFICES), f'TOTAL: {year}/{field}')
        path = downloads / f'triguard-statistics-{year}.csv'
        with path.open(encoding='utf-8-sig', newline='') as stream:
            reader = csv.DictReader(stream)
            require(reader.fieldnames == ['연도','지방청',*FIELDS], f'CSV_HEADERS: {year}')
            records = list(reader)
        actual = {}
        for r in records:
            key = (int(r['연도']),r['지방청'])
            require(key not in actual, f'CSV_DUPLICATE: {key}')
            actual[key] = {f:int(r[f]) for f in FIELDS}
        require(actual == {k:v for k,v in observed.items() if k[0] == year}, f'CSV_VALUES: {year}')
    return {
        'schema_version': 1, 'status': 'passed', 'checked_at': datetime.now(timezone.utc).isoformat(),
        'source_sha256': snapshot['source_sha256'], 'row_count':len(observed),
        'numeric_value_count':len(observed)*len(FIELDS), 'year_count':len(years),
        'office_count':len(OFFICES), 'national_total_checks':len(years)*len(FIELDS),
        'download_files_checked':len(years),
        'checks':['source_hash','source_values','unique_year_office','nonnegative_integer_counts','office_coverage','national_totals','csv_downloads'],
        'scope':'보관 원자료와의 일치·형식·합계 검사',
        'limitations':['공식 출처의 정확성·최신성은 검증하지 않음','통계적 예측 성능·기관 인증을 의미하지 않음'],
    }


def validate_project(root=ROOT):
    snapshot = json.loads((root/'public-statistics/data/statistics.json').read_text())
    source = root/'data'/snapshot['source']
    require(source.parent == root/'data', 'SOURCE_PATH: invalid source filename')
    return validate(snapshot, source.read_bytes(), root/'public-statistics/downloads')


if __name__ == '__main__':
    print(json.dumps(validate_project(),ensure_ascii=False,indent=2))
