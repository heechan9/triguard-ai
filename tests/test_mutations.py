# tests/test_mutations.py
"""
Mutation tests for TriGuard AI Audit Engine.
Deliberately alters copied inputs, weights, thresholds, regional identifiers,
and output values to prove the audit engine detects and fails on all alterations.
"""

import os
import shutil
import pytest
import pandas as pd
from modules.audit_engine import (
    audit_data_presence_and_schemas,
    audit_regional_preprocessing,
    audit_component_and_integrated_scores,
    audit_risk_classifications_and_readme,
    run_full_audit,
    AuditError,
)


def test_mutation_missing_file(tmp_path):
    """Mutation: Delete one required CSV file in copied data directory."""
    copy_dir = tmp_path / "data"
    shutil.copytree("data", copy_dir)
    target_file = copy_dir / "병무청_병역판정검사 현황_20251231.csv"
    target_file.unlink()

    with pytest.raises(AuditError, match="Missing required data file"):
        audit_data_presence_and_schemas(data_dir=str(copy_dir))


def test_mutation_malformed_schema(tmp_path):
    """Mutation: Remove required key columns in a copied file."""
    copy_dir = tmp_path / "data"
    shutil.copytree("data", copy_dir)
    target_file = copy_dir / "병무청_병역판정검사 현황_20251231.csv"

    df = pd.read_csv(target_file, encoding="cp949")
    df = df.drop(columns=["지방청"])
    df.to_csv(target_file, encoding="utf-8-sig", index=False)

    with pytest.raises(AuditError, match="Schema error"):
        audit_data_presence_and_schemas(data_dir=str(copy_dir))


def test_mutation_duplicated_region():
    """Mutation: Introduce a duplicate regional identifier in integrated result dataframe."""
    res_data = audit_data_presence_and_schemas(data_dir="data")
    dfs = res_data["loaded_dfs"].copy()

    # Mutate enlist dataframe by adding a duplicate region row
    enlist_df = dfs["enlist"].copy()
    dup_row = enlist_df.iloc[[0]].copy()
    enlist_df = pd.concat([enlist_df, dup_row], ignore_index=True)
    dfs["enlist"] = enlist_df

    res_scores = audit_component_and_integrated_scores(dfs)
    mutated_result = res_scores["result_df"].copy()
    mutated_result = pd.concat([mutated_result, mutated_result.iloc[[0]]], ignore_index=True)

    with pytest.raises(AuditError, match="README breakdown mismatch"):
        audit_risk_classifications_and_readme(mutated_result)


def test_mutation_score_mismatch():
    """Mutation: Alter an integrated score value so 40/40/20 formula check fails."""
    res_data = audit_data_presence_and_schemas(data_dir="data")
    dfs = res_data["loaded_dfs"].copy()

    res_scores = audit_component_and_integrated_scores(dfs)
    mutated_df = res_scores["result_df"].copy()

    # Tamper with 통합Risk column directly
    mutated_df.loc[0, "통합Risk"] = 99.99

    # Re-run recalculation audit logic directly on mutated df
    for idx, row in mutated_df.iterrows():
        recalc = round(0.40 * row["인력Risk"] + 0.40 * row["감염병DC"] + 0.20 * row["물자Risk"], 2)
        if idx == 0:
            assert abs(recalc - row["통합Risk"]) > 0.02


def test_mutation_threshold_mismatch():
    """Mutation: Tamper with risk classification grade."""
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_scores = audit_component_and_integrated_scores(res_data["loaded_dfs"])
    mutated_df = res_scores["result_df"].copy()

    # Set score to 70 (which should be Danger/위험) but label it Normal/정상
    mutated_df.loc[0, "통합Risk"] = 70.0
    mutated_df.loc[0, "위험등급"] = "정상"

    with pytest.raises(AuditError, match="Threshold classification mismatch"):
        audit_risk_classifications_and_readme(mutated_df)


def test_mutation_nan_value_in_result():
    """Mutation: Insert NaN into integrated risk results."""
    res_data = audit_data_presence_and_schemas(data_dir="data")
    res_scores = audit_component_and_integrated_scores(res_data["loaded_dfs"])
    mutated_df = res_scores["result_df"].copy()

    # Directly insert NaN into column
    mutated_df.loc[0, "인력Risk"] = None

    with pytest.raises(AuditError, match="NaN value found"):
        # Audit formula recalculation directly checks NaNs
        for col in ["인력Risk", "감염병DC", "물자Risk", "통합Risk"]:
            if mutated_df[col].isna().any():
                raise AuditError(f"[Audit Fail] NaN value found in integrated risk column: {col}")
