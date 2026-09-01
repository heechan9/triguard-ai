# tests/test_audit.py
"""
Synthetic unit tests for TriGuard AI Audit Engine.
Uses small synthetic fixtures.
"""

import pytest
import pandas as pd
import numpy as np
from modules.audit_engine import (
    audit_data_presence_and_schemas,
    audit_regional_preprocessing,
    audit_component_and_integrated_scores,
    audit_risk_classifications_and_readme,
    audit_ml_methodology_and_claims,
    run_full_audit,
    AuditError,
)
from modules.risk_engine import (
    calc_integrated_risk,
    calc_manpower_risk,
    calc_disease_dc,
    calc_material_risk,
    GRADE_DANGER,
    GRADE_CAUTION,
)


def test_audit_data_presence_and_schemas():
    res = audit_data_presence_and_schemas(data_dir="data")
    assert res["status"] == "PASSED"
    assert res["file_count"] == 12
    assert "loaded_dfs" in res


def test_audit_regional_preprocessing(tmp_path):
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_reg = audit_regional_preprocessing(res_data["loaded_dfs"])
    assert res_reg["status"] == "PASSED"
    assert res_reg["regional_count"] == 14


def test_audit_component_and_integrated_scores():
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_scores = audit_component_and_integrated_scores(res_data["loaded_dfs"])
    assert res_scores["status"] == "PASSED"
    assert abs(res_scores["material_risk_score"] - 20.43) < 0.1


def test_audit_risk_classifications_and_readme():
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_scores = audit_component_and_integrated_scores(res_data["loaded_dfs"])
    res_cls = audit_risk_classifications_and_readme(res_scores["result_df"])
    assert res_cls["status"] == "PASSED"
    assert res_cls["breakdown"]["danger"] == 0
    assert res_cls["breakdown"]["caution"] == 13
    assert res_cls["breakdown"]["normal"] == 1


def test_audit_ml_methodology():
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_scores = audit_component_and_integrated_scores(res_data["loaded_dfs"])
    res_ml = audit_ml_methodology_and_claims(res_scores["result_df"])
    assert res_ml["status"] == "PASSED"
    assert res_ml["findings"]["is_independent_predictive_evaluation"] is False
    assert res_ml["findings"]["target_leakage_detected"] is True
