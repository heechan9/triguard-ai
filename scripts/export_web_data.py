"""Export the canonical TriGuard risk snapshot for the static Vercel demo."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from modules.preprocess import (
    aggregate_disease_by_jibang,
    load_csv,
    parse_ari,
    parse_byungmu_enlist,
    parse_byungmu_exam,
    parse_byungmu_exempt,
    parse_dapa_bidders,
    parse_dapa_domestic,
    parse_dapa_foreign,
    parse_infectious_disease_national,
    parse_infectious_disease_regional,
    parse_influenza,
    parse_population,
    parse_strategic_goods,
)
from modules.risk_engine import (
    WEIGHTS_INTEGRATED,
    calc_disease_dc,
    calc_integrated_risk,
    calc_manpower_risk,
    calc_material_risk,
)


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "web" / "data" / "risk_snapshot.json"

FILES = {
    "exam": "병무청_병역판정검사 현황_20251231.csv",
    "enlist": "병무청_현역병 지방청별 입영현황_20241231.csv",
    "exempt": "병무청_병역면제자 관리현황_20241231.csv",
    "regional": "질병관리청_지역별 감염병 발생현황(질병별 연도별 월별 기간별)통계_지역별.csv",
    "national": "질병관리청_질병별 감염병 발생현황 (연도별 월별 기간별) 통계.csv",
    "flu": "질병관리청_법정감염병 표본감시_통계_인플루엔자.csv",
    "ari": "질병관리청_법정감염병 표본감시_통계_급성호흡기감염증.csv",
    "dapa_dom": "방위사업청_국내조달 계약정보_20251231.csv",
    "dapa_for": "방위사업청_국외조달 계약정보_20251231.csv",
    "dapa_bidders": "방위사업청 국내조달 입찰참여업체정보_20251231.csv",
    "strategic": "무역안보관리원_전략물자 품목키워드 및 개정정보_20260522.csv",
    "population": "행정안전부_지역별 연령별 주민등록 인구현황_월간.csv",
}


def raw(key: str):
    return load_csv(DATA / FILES[key])


def build_snapshot() -> dict:
    exam = parse_byungmu_exam(raw("exam"))
    enlist = parse_byungmu_enlist(raw("enlist"))
    exempt = parse_byungmu_exempt(raw("exempt"))
    population = parse_population(raw("population"))

    regional = parse_infectious_disease_regional(raw("regional"))
    jibang_disease = aggregate_disease_by_jibang(regional)
    national = parse_infectious_disease_national(raw("national"))
    flu = parse_influenza(raw("flu"))
    ari = parse_ari(raw("ari"))

    domestic = parse_dapa_domestic(raw("dapa_dom"))
    foreign = parse_dapa_foreign(raw("dapa_for"))
    bidders = parse_dapa_bidders(raw("dapa_bidders"))
    strategic = parse_strategic_goods(raw("strategic"))

    manpower, manpower_warnings = calc_manpower_risk(exam, enlist, exempt, population)
    disease, _, jibang_dc, _, disease_warnings = calc_disease_dc(
        regional, national, flu, ari, jibang_disease
    )
    material, _, material_warnings = calc_material_risk(
        domestic, foreign, strategic, bidders
    )
    result, integrated_warnings = calc_integrated_risk(
        manpower, disease, material, jibang_dc
    )
    result = result.sort_values("통합Risk", ascending=False).reset_index(drop=True)

    grade_counts = result["위험등급"].value_counts().to_dict()
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_mode": "repository public-data snapshot",
        "weights": WEIGHTS_INTEGRATED,
        "summary": {
            "regions": int(len(result)),
            "danger": int(grade_counts.get("위험", 0)),
            "caution": int(grade_counts.get("주의", 0)),
            "normal": int(grade_counts.get("정상", 0)),
            "national_material_risk": round(float(material), 2),
        },
        "warnings": manpower_warnings
        + disease_warnings
        + material_warnings
        + integrated_warnings,
        "regions": result.to_dict(orient="records"),
        "claim_boundary": (
            "현재 공개데이터 스냅샷에 계산 규칙을 적용한 우선점검 지표이며, "
            "미래 사건의 예측 성능이나 정책 효과를 입증하지 않는다."
        ),
    }


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(build_snapshot(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(OUTPUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
