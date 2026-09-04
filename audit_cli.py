#!/usr/bin/env python3
"""
TriGuard AI - Audit CLI & Report Generator
Runs independent data, risk-score, and dashboard consistency audits.
"""

import sys
import argparse
import json
import os
from datetime import datetime
from modules.audit_engine import run_full_audit, AuditError


def generate_json_report(summary: dict, output_path: str):
    """Generates reproducible JSON audit report."""
    report_data = {
        "audit_timestamp": datetime.now().isoformat(),
        "audit_pass": summary.get("audit_pass", False),
        "data_presence_and_schemas": {
            "status": summary["data_presence_and_schemas"]["status"],
            "file_count": summary["data_presence_and_schemas"]["file_count"],
            "file_details": {
                k: {"rows": v["rows"], "cols": v["cols"]}
                for k, v in summary["data_presence_and_schemas"]["file_details"].items()
            },
        },
        "regional_preprocessing": summary["regional_preprocessing"],
        "component_and_integrated_scores": {
            "status": summary["component_and_integrated_scores"]["status"],
            "material_risk_score": summary["component_and_integrated_scores"]["material_risk_score"],
        },
        "risk_classifications_and_readme": summary["risk_classifications_and_readme"],
        "ml_methodology_and_claims": summary["ml_methodology_and_claims"],
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)


def generate_markdown_report(summary: dict, output_path: str):
    """Generates reproducible Markdown audit report."""
    md_lines = [
        "# 🛡️ TriGuard AI Independent Audit Report",
        "",
        f"**Audit Execution Timestamp:** `{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`  ",
        f"**Audit Overall Status:** `{'PASSED ✅' if summary.get('audit_pass') else 'FAILED ❌'}`",
        "",
        "---",
        "",
        "## 1. Provenance Verification Summary",
        "",
        "| Audit Check | Requirement | Result |",
        "|---|---|---|",
        f"| Data Presence & Schema | 12 CSV files present and schema valid | {summary['data_presence_and_schemas']['status']} |",
        f"| Regional Preprocessing | Exactly 14 regional units without duplicates/NaNs | {summary['regional_preprocessing']['status']} |",
        f"| Component & Score Calculations | Manpower, Disease DC, Material (20.43) reproducible | {summary['component_and_integrated_scores']['status']} |",
        f"| Weighted Formula Consistency | 40% Manpower + 40% Disease + 20% Material | {summary['component_and_integrated_scores']['status']} |",
        f"| Risk Classifications & README Claims | Thresholds (>=60, >=35, <35) match README counts (0/13/1) | {summary['risk_classifications_and_readme']['status']} |",
        f"| ML Methodology & Claim Boundaries | 5-Fold CV 93% accuracy evaluated as rule-alignment metric | {summary['ml_methodology_and_claims']['status']} |",
        "",
        "---",
        "",
        "## 2. Evidence Chain & Dataset Inventory",
        "",
        "| Dataset Key | File Name | Rows | Columns | Status |",
        "|---|---|---|---|---|",
    ]

    for k, v in summary["data_presence_and_schemas"]["file_details"].items():
        fname = os.path.basename(v["path"])
        md_lines.append(f"| `{k}` | `{fname}` | {v['rows']} | {v['cols']} | OK |")

    md_lines.extend([
        "",
        "---",
        "",
        "## 3. Risk Score & Classification Breakdown",
        "",
        f"- **Total Regional Units:** `{summary['regional_preprocessing']['regional_count']}`",
        f"- 🔴 **Danger (>= 60):** `{summary['risk_classifications_and_readme']['breakdown']['danger']}`",
        f"- 🟡 **Caution (35~60):** `{summary['risk_classifications_and_readme']['breakdown']['caution']}`",
        f"- 🟢 **Normal (< 35):** `{summary['risk_classifications_and_readme']['breakdown']['normal']}`",
        f"- **National Material Risk Score:** `{summary['component_and_integrated_scores']['material_risk_score']}` / 100",
        "",
        "---",
        "",
        "## 4. Special ML Validation & Claim Boundaries",
        "",
        f"- **Reported 5-Fold CV Accuracy:** `{summary['ml_methodology_and_claims']['findings']['cv_accuracy_score']:.2f}`",
        f"- **Independent Predictive Evaluation:** `{summary['ml_methodology_and_claims']['findings']['is_independent_predictive_evaluation']}`",
        f"- **Target Leakage / Circular Validation:** `{summary['ml_methodology_and_claims']['findings']['target_leakage_detected']}`",
        "",
        "> ⚠️ **Claim Boundary Notice:**",
        f"> {summary['ml_methodology_and_claims']['findings']['description']}",
        "",
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))


def main():
    parser = argparse.ArgumentParser(description="TriGuard AI Independent Audit CLI")
    parser.add_argument("--data-dir", default="data", help="Path to data directory")
    parser.add_argument("--json", help="Path to output JSON audit report")
    parser.add_argument("--markdown", help="Path to output Markdown audit report")

    args = parser.parse_args()

    try:
        summary = run_full_audit(data_dir=args.data_dir)
        print("✅ TriGuard AI Audit PASSED successfully.")

        if args.json:
            generate_json_report(summary, args.json)
            print(f"📄 Generated JSON report: {args.json}")

        if args.markdown:
            generate_markdown_report(summary, args.markdown)
            print(f"📄 Generated Markdown report: {args.markdown}")

        sys.exit(0)

    except AuditError as ae:
        print(f"❌ AUDIT FAILED: {str(ae)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ UNEXPECTED AUDIT ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
