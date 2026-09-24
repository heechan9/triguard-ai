'use strict';
// Public statistics verification evidence; no scoring or operational recommendations.
const ValidationTrace = (() => {
  const checks = [
    ['CHECK-01','source_hash','보관 원본 식별','원자료 파일 식별값과 보고서가 일치해야 함','원본 버전과 보고서를 함께 갱신'],
    ['CHECK-02','source_values','표시 수치 대조','모든 연도·지방청의 6개 수치가 원본과 같아야 함','표시 자료를 원본으로부터 다시 생성'],
    ['CHECK-03','unique_year_office','중복 확인','연도·지방청 조합이 중복되지 않아야 함','중복 기록을 원문과 대조'],
    ['CHECK-04','nonnegative_integer_counts','인원 수 형식','누락 없이 0 이상의 정수여야 함','빈 값과 0을 구분하고 원자료 확인'],
    ['CHECK-05','office_coverage','관할 누락 확인','연도마다 14개 지방청과 전국 행이 있어야 함','관할·연도별 누락 여부 확인'],
    ['CHECK-06','national_totals','전국 합계 대조','지방청 합계와 전국 값이 같아야 함','집계 범위와 합계 확인'],
    ['CHECK-07','csv_downloads','다운로드 대조','연도별 CSV와 표시 자료가 같아야 함','다운로드 파일 재생성 후 재검사']
  ];
  function accepts(report, data) {
    if (!report || !data || report.status !== 'passed' || report.schema_version !== 1 ||
        !/^[a-f0-9]{64}$/.test(report.source_sha256 || '') ||
        report.source_sha256 !== data.source_sha256 || !Array.isArray(data.rows) ||
        !data.rows.length || !Number.isFinite(Date.parse(report.checked_at)) ||
        !Array.isArray(report.checks) || !checks.every((c) => report.checks.includes(c[1]))) return false;
    const years = new Set(data.rows.map((r) => r.year)).size;
    const expected = {row_count:data.rows.length,numeric_value_count:data.rows.length*6,
      year_count:years,office_count:14,national_total_checks:years*6,download_files_checked:years};
    return Object.entries(expected).every(([key,value]) => Number.isSafeInteger(report[key]) && report[key] === value);
  }
  function rows(report, data) {
    const valid = accepts(report, data);
    return checks.map(([id,key,name,criterion,action]) => ({
      id,name,criterion,status:valid?'배포 전 검사 통과':'미확인',
      action:valid?'자료 변경 시 재검사':action
    }));
  }
  function render(report, data) {
    const target = document.getElementById('validationTrace');
    if (!target) return;
    target.replaceChildren();
    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.textContent = '병역판정검사 보관 자료 · 요구사항별 배포 전 검사';
    table.append(caption);
    const head = document.createElement('thead'), hr = document.createElement('tr');
    ['검사 ID','확인 항목','합격 기준','확인 결과','후속 조치'].forEach((label) => {
      const th=document.createElement('th'); th.scope='col'; th.textContent=label; hr.append(th);
    });
    head.append(hr); table.append(head);
    const body=document.createElement('tbody');
    rows(report,data).forEach((row) => {
      const tr=document.createElement('tr');
      Object.values(row).forEach((value,i) => {
        const cell=document.createElement(i===0?'th':'td');
        if(i===0) cell.scope='row';
        cell.textContent=value; tr.append(cell);
      });
      body.append(tr);
    });
    table.append(body); target.append(table);
    document.getElementById('validationEvidence').hidden=!accepts(report,data);
  }
  return {accepts,rows,render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports=ValidationTrace;
