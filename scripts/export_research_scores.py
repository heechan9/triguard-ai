"""Restore the archived public-statistics research result without recalculation."""
from pathlib import Path
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['인력Risk','감염병DC','물자Risk','통합Risk']
OFFICES = {'서울','부산울산','대구경북','경인','광주전남','대전충남','강원','충북','전북','경남','제주','인천','경기북부','강원영동'}

def validate(snapshot):
    if snapshot['weights'] != {'인력':0.4,'감염병':0.4,'물자':0.2}:
        raise ValueError('Research weights changed')
    rows = snapshot['regions']
    if len(rows)!=14 or {r['지방청'] for r in rows} != OFFICES:
        raise ValueError('Research office coverage mismatch')
    for r in rows:
        for f in FIELDS:
            if type(r[f]) not in (int,float) or not math.isfinite(r[f]) or not 0<=r[f]<=100:
                raise ValueError('Invalid research score')
        total = .4*r['인력Risk'] + .4*r['감염병DC'] + .2*r['물자Risk']
        if abs(total-r['통합Risk']) > .02:
            raise ValueError('Research weighted total mismatch')
        expected = '위험' if r['통합Risk']>=60 else '주의' if r['통합Risk']>=35 else '정상'
        if r['위험등급'] != expected:
            raise ValueError('Research grade mismatch')
    return True

def generate(root=ROOT):
    path = root/'web/data/risk_snapshot.json'
    raw = path.read_bytes()
    snapshot = json.loads(raw)
    validate(snapshot)
    return {'generated_at':snapshot['generated_at'], 'source':'web/data/risk_snapshot.json', 'source_sha256':hashlib.sha256(raw).hexdigest(),
            'weights':snapshot['weights'], 'regions':[{k:r[k] for k in ['지방청']+FIELDS+['위험등급']} for r in snapshot['regions']],
            'limitations':['기존 연구 결과를 그대로 표시합니다. 연도 선택에 따라 재계산되지 않습니다.',
            '기간·단위 미확인 질병청 수치의 합산과 임의 정규화가 포함되어 있어 실제 위험 확률이나 검증된 예측값이 아닙니다.',
            '물자 지표는 전국 공통값입니다. 업체 소재지별 기록 수와 다른 지표입니다.',
            '행정·보건·조달 통계 검토용 시제품 결과입니다. 실제 인원 배치·징집 적합성·조달 결정 근거로 사용하지 않습니다.']}
