"""Source-backed descriptive metadata; never infer unknown numeric units."""
from collections import Counter
from pathlib import Path
import json

PROVINCES = ['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시','경기도','강원도','충청북도','충청남도','전라북도','전라남도','경상북도','경상남도','제주특별자치도']
ALIASES = dict(zip(PROVINCES,PROVINCES))
ALIASES.update({'강원특별자치도':'강원도','전북특별자치도':'전라북도','서울':'서울특별시','부산시':'부산광역시','충북':'충청북도','전북':'전라북도','대구':'대구광역시','광주':'광주광역시'})

def supplier_regions(header, records):
    index = header.index('대표업체주소')
    counts = Counter()
    for row in records:
        tokens = row[index].strip().split()
        counts[ALIASES.get(tokens[0] if tokens else '', '미분류')] += 1
    return {'basis':'대표업체주소의 첫 행정구역 표기', 'counts':{p:counts[p] for p in PROVINCES}, 'unclassified':counts['미분류'], 'total':len(records), 'note':'대표업체 소재지 기준 국내 계약 기록 수입니다. 납품지·수요기관 소재지·고유 계약 수가 아닙니다. 병무청 선택 연도와 별개인 원본 전체 기간 집계입니다.'}

def health_metadata(name, columns, rows, source_sha256=None):
    if '통계_지역별' in name:
        columns[:2] = ['시·도 표기 (원자료 1열)','지역 표기 (원자료 2열)']
        page='rginEDW.do'
        identified='원본의 지역 문자열을 표시명으로 사용했습니다. 수치 열의 질병명·기간·발생수/발생률 선택 조건은 CSV에 없습니다.'
    elif '인플루엔자' in name:
        columns[0]='절기 표기 (원자료 1열)'
        page='st/influ.do'
        identified='2020–2021절기 공식 표의 36–52주와 다음 해 1–35주 수치를 대조했습니다. 보관 CSV는 그 사이 추가 빈 열이 있어 전체 절기별 주차 배치는 아직 확정하지 않았습니다. 수치 단위도 미확인입니다.'
    elif '급성호흡기' in name:
        evidence = json.loads((Path(__file__).resolve().parents[1] / 'docs/ARI_SOURCE_COMPARISON.json').read_text())
        if source_sha256 != evidence['source_sha256'] or len(rows) != evidence['compared_rows']:
            raise ValueError('ARI source changed: repeat official schema comparison')
        columns[:] = ['연도','주차'] + [h + ' (입원환자수, 명)' for h in evidence['header']] + ['원본 끝 빈 열']
        return {'reference_url':evidence['reference_url'], 'status':'주차·바이러스 열 순서 확인 · 현재 공식 수치와 8행 차이',
                'note':'2020년 1주–2026년 21주 보관 자료. 공식 바이러스·전체 연령 조회와 334행 대조: 326행 일치, 8행 차이. 잠정통계 정정·집계 진행에 따른 차이 가능성이 있어 보관 수치는 유지했습니다. 마지막 빈 열은 보존합니다.',
                'unit':'입원환자수(명)', 'period':'2020년 1주–2026년 21주', 'reviewed_on':evidence['reviewed_on'],
                'evidence_url':'https://github.com/heechan9/triguard-ai/blob/main/docs/ARI_SOURCE_COMPARISON.json'}
    else:
        columns[:2]=['감염병 등급 표기 (원자료 1열)','감염병명 표기 (원자료 2열)']
        page='inftnsdsEDW.do'
        identified='원본에 적힌 감염병 등급과 이름을 표시했습니다. 연도별 수치 열의 실제 연도·단위는 CSV에 없습니다.'
    return {'reference_url':'https://dportal.kdca.go.kr/pot/is/'+page,'note':identified,'status':'식별 열만 정리 · 수치 열 메타데이터 미확인'}
