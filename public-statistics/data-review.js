'use strict';
function buildDataReview(data, agencies, report, year, province, offices) {
  const aliases = {서울특별시:'서울',부산광역시:'부산',울산광역시:'울산',대구광역시:'대구',경상북도:'경북',인천광역시:'인천',경기도:'경기',광주광역시:'광주',전라남도:'전남',대전광역시:'대전',충청남도:'충남',세종특별자치시:'세종',강원도:'강원',충청북도:'충북',전라북도:'전북',경상남도:'경남',제주특별자치도:'제주'};
  const selectedOffices = offices[province] || [];
  const related = Object.keys(offices).filter(p => offices[p].some(o => selectedOffices.includes(o)));
  const rows = (data?.rows || []).filter(r => r.year === Number(year) && selectedOffices.includes(r.office));
  const fields = ['처분인원','현역','보충역','전시근로역','병역면제','재신체검사'];
  const present = rows.reduce((n,r) => n + fields.filter(f => Number.isInteger(r.values[f]) && r.values[f] >= 0).length,0);
  const regional = agencies.find(d => d.source.includes('통계_지역별'));
  const health = (regional?.rows || []).filter(r => r[0] === r[1] && related.some(p => aliases[p] === r[0]));
  const procurement = agencies.filter(d => d.source.startsWith('방위사업청'));
  const supplier = procurement.find(d=>d.supplier_regions)?.supplier_regions;
  const supplierRows = related.map(region=>({region,count:supplier?.counts[region] ?? null}));
  const complete = selectedOffices.length > 0 && rows.length === selectedOffices.length && new Set(rows.map(r=>r.office)).size === selectedOffices.length && present === selectedOffices.length * fields.length;
  const linked = health.length === related.length && related.length > 0 && procurement.length === 3;
  const verified = !!(data && report?.status === 'passed' && report.source_sha256 === data.source_sha256 && report.row_count === data.rows.length && Number.isFinite(Date.parse(report.checked_at)) && agencies.length === 7 && agencies.every(d => report.agency_sources?.some(s => s.source === d.source && s.sha256 === d.sha256 && s.source_rows === d.source_rows)));
  const checks = [{label:'병무청 선택 연도·관할 값',ok:complete},{label:'질병청 지역행·방위사업청 자료 연결',ok:linked},{label:'배포 보고서와 8개 원본 식별정보 일치',ok:verified},{label:'기관 간 공통 기준일·단위 확인',ok:false}];
  return {related, rows, health, regional, procurement, supplier, supplierRows, present, expected:selectedOffices.length*fields.length, checks, passed:checks.filter(c=>c.ok).length};
}
if (typeof module !== 'undefined') module.exports = {buildDataReview};
