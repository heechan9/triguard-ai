"""Source-backed descriptive metadata; never infer unknown numeric units."""
from collections import Counter

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

def health_metadata(name, columns, rows):
    if '통계_지역별' in name:
        columns[:2] = ['시·도 표기 (원자료 1열)','지역 표기 (원자료 2열)']
        page='rginEDW.do'
        identified='원본의 지역 문자열을 표시명으로 사용했습니다. 수치 열의 질병명·기간·발생수/발생률 선택 조건은 CSV에 없습니다.'
    elif '인플루엔자' in name:
        columns[0]='절기 표기 (원자료 1열)'
        page='st/influ.do'
        identified='원본에 기재된 절기 표기를 보존했습니다. 각 수치 열의 주차·단위는 확정하지 않았습니다.'
    elif '급성호흡기' in name:
        columns[:2]=['연도 표기 (원자료 1열)','기간 코드 (원자료 2열, 단위 미확인)']
        page='st/ari.do'
        identified='원본의 연도와 기간 코드를 보존했습니다. 기간 코드를 월로 간주하지 않으며 수치 열의 병원체명·단위는 미확인입니다.'
    else:
        columns[:2]=['감염병 등급 표기 (원자료 1열)','감염병명 표기 (원자료 2열)']
        page='inftnsdsEDW.do'
        identified='원본에 적힌 감염병 등급과 이름을 표시했습니다. 연도별 수치 열의 실제 연도·단위는 CSV에 없습니다.'
    return {'reference_url':'https://dportal.kdca.go.kr/pot/is/'+page,'note':identified,'status':'식별 열만 정리 · 수치 열 메타데이터 미확인'}
