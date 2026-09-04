# 🛡️ TriGuard AI Data, Risk-Score & Dashboard Audit

## 📋 Audit Overview

This document presents the independent data provenance, risk-score calculation, dashboard consistency, and machine learning methodology audit for the **TriGuard AI** repository.

---

## 🔍 Provenance Chain & Audit Verifications

The audit engine (`modules/audit_engine.py`) and CLI (`audit_cli.py`) verify the full provenance chain across 10 strict verification steps:

1. **Expected Datasets Present & Readable**:
   All 12 public CSV snapshot files across 5 agencies (병무청, 질병관리청, 방위사업청, 행정안전부, 무역안보관리원) in `data/` are verified for presence and readability.
2. **Schema & Key Column Validation**:
   Key column headers (`연도`, `지방청`, `구분`, `계약체결방법명`, `대표업체명`, `총인구수`, `남_20~29세`, etc.) match expected structural schemas.
3. **Regional Preprocessing Consistency**:
   Data parsing consistently yields exactly 14 regional units (`서울`, `부산울산`, `대구경북`, `경인`, `광주전남`, `대전충남`, `강원`, `충북`, `전북`, `경남`, `제주`, `인천`, `경기북부`, `강원영동`).
4. **Component Risk Reproducibility**:
   Manpower Risk, Infectious Disease DC, and Material Risk components are independently recalculated and verified.
5. **40% / 40% / 20% Integrated Score Consistency**:
   Integrated Risk Score is recalculated for all 14 regions (`40% Manpower + 40% Disease + 20% Material`) with zero numerical discrepancy.
6. **Risk Classification Thresholds**:
   Classifications strictly adhere to documented thresholds (`>= 60`: 🔴 위험, `35 ~ 60`: 🟡 주의, `< 35`: 🟢 정상).
7. **Dashboard Consistency**:
   Dashboard KPI cards, tables, maps, and component breakdowns match the risk-engine output metrics.
8. **README Claim Verification**:
   Numerical claims in `README.md` match generated runtime artifacts (0 Danger, 13 Caution, 1 Normal; Total 14 regions; Material Risk score 20.43/100).
9. **National Material Risk Treatment**:
   DAPA material data (which lacks regional tags) is applied uniformly across all 14 regions as a national external risk factor (20.43/100).
10. **Explicit Error Failures**:
    Missing files, malformed schemas, duplicated regions, NaN values, score mismatches, or threshold violations trigger explicit `AuditError` failures with a non-zero exit code (1).

---

## ⚠️ Special ML Validation & Claim Boundaries

### Evaluation Findings
- **Reported Metric**: 5-fold cross-validation accuracy of **93%** (or ~91–93% depending on CV split random seed).
- **Target Leakage / Circular Validation**:
  In `modules/ml_engine.py`, both real and simulated training data labels (`위험등급`) are generated directly using the rule-based risk score formula and its thresholds (`score >= 60` -> 위험, `score >= 35` -> 주의, else 정상).
- **Evaluation Boundary**:
  The 93% CV accuracy score **does not represent real-world predictive accuracy** for future disease outbreaks or manpower deficits. It evaluates **internal consistency and rule alignment** between the RandomForest classifier and the rule-based decision logic.

---

## 🛠️ Running the Audit CLI & Tests

### 1. Run Audit CLI
```bash
python3 audit_cli.py --json audit_report.json --markdown audit_report.md
```

### 2. Run Test Suite
```bash
python3 -m pytest tests/
```

- `tests/test_audit.py`: Synthetic unit tests for audit engine components.
- `tests/test_mutations.py`: Mutation tests proving the audit engine catches missing files, schema corruptions, duplicated regions, altered weights, threshold mismatches, and NaN values.
