'use strict';
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields = ['처분인원','현역','보충역','전시근로역','병역면제','재신체검사'];
const offices = {
  서울특별시:['서울'], 부산광역시:['부산울산'], 울산광역시:['부산울산'],
  대구광역시:['대구경북'], 경상북도:['대구경북'], 인천광역시:['인천'],
  경기도:['경인','경기북부'], 광주광역시:['광주전남'], 전라남도:['광주전남'],
  대전광역시:['대전충남'], 충청남도:['대전충남'], 세종특별자치시:['대전충남'],
  강원도:['강원','강원영동'], 충청북도:['충북'], 전라북도:['전북'], 경상남도:['경남'], 제주특별자치도:['제주'],
};
let data;
let researchScores = null;
let validationReport = null;
async function loadValidationReport() {
  const panel = $('#validationSummary');
  try {
    const response = await fetch('/data/validation_report.json');
    if (!response.ok) throw new Error('Validation report unavailable');
    const report = await response.json();
    if (report.status !== 'passed' || report.source_sha256 !== data.source_sha256 ||
        report.row_count !== data.rows.length || !Number.isFinite(Date.parse(report.checked_at))) {
      throw new Error('Validation report does not match the displayed source');
    }
    validationReport = report;
    renderIntegrated();
    panel.textContent = `배포 전 원자료 대조 완료: ${report.row_count}행 · ${report.numeric_value_count}개 수치 · 연도별 합계 ${report.national_total_checks}건 · 다운로드 ${report.download_files_checked}개. 검사 시각: ${new Date(report.checked_at).toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})} (한국시간). 보관 원자료와의 일치 여부를 검사하며, 공식 통계의 정확성·최신성을 보증하지 않습니다.`;
  } catch (_) {
    validationReport = null;
    renderIntegrated();
    panel.textContent = '원자료 대조 결과를 확인할 수 없습니다. 검증 완료로 해석하지 말고 원본 CSV와 대조해 주세요.';
  }
}
let selected = '서울특별시';
const validCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const count = (v) => validCount(v) ? v.toLocaleString('ko-KR') : '자료 없음';
const yearRows = () => data.rows.filter((r) => r.year === Number($('#year').value));

function selectRegion(name) {
  selected = name;
  $('#province').value = name;
  const selectedOffices = offices[name] || [];
  const relatedProvinces = Object.keys(offices).filter((province) =>
    offices[province].some((office) => selectedOffices.includes(office)));
  document.querySelectorAll('.province').forEach((p) => {
    const active = relatedProvinces.includes(p.dataset.province);
    p.classList.toggle('selected', active);
    p.setAttribute('aria-pressed', String(active));
  });
  const rows = yearRows().filter((r) => selectedOffices.includes(r.office));
  $('#mapDetail').innerHTML = `<p class="eyebrow">SELECTED JURISDICTION</p><h3>${relatedProvinces.map(esc).join(' · ')}</h3><p>선택 지역: ${esc(name)}</p>${relatedProvinces.length > 1 ? '<p>같은 지방청 관할 지역을 함께 표시합니다. 아래 수치는 관할 전체 통계이며 지역별로 중복 합산하지 않습니다.</p>' : ''}<p>${esc($('#year').value)}년 · 지방청 관할 전체 통계 · 단위: 명</p>` +
    (rows.length ? rows.map((r) => `<section class="office-detail"><h4>${esc(r.office)} 지방청</h4><dl>${fields.map((f) => `<div><dt>${esc(f)}</dt><dd>${count(r.values[f])}</dd></div>`).join('')}</dl></section>`).join('') : '<p>이 연도의 해당 지방청 자료가 없습니다.</p>');
  renderDataGuide(name, selectedOffices, relatedProvinces, rows);
  renderIntegrated();
  renderResearch();
  if (window.renderStatisticsWorkbench) window.renderStatisticsWorkbench();
  if (window.syncDashboardURL) window.syncDashboardURL();
}

function renderDataGuide(name, selectedOffices, relatedProvinces, rows) {
  const missingOffices = selectedOffices.filter((office) => !rows.some((r) => r.office === office));
  const missingFields = rows.flatMap((r) => fields.filter((field) => !validCount(r.values[field])).map((field) => `${r.office} ${field}`));
  const missing = [...missingOffices.map((office) => `${office} 지방청 행`), ...missingFields];
  const completeness = !selectedOffices.length ? '연결된 지방청 정보가 없습니다.' : missing.length
    ? `확인 필요: ${missing.join(', ')}. 누락값은 0명으로 해석하지 마세요.`
    : `선택 연도의 ${selectedOffices.length}개 지방청 · ${rows.length * fields.length}개 항목에 값이 있습니다. 원자료 자체의 정확성을 보증하는 검증은 아닙니다.`;
  const scope = relatedProvinces.length > 1
    ? `${relatedProvinces.join(' · ')}의 통합 관할 수치입니다. 각 시·도의 개별 수치로 나누거나 중복 합산하지 마세요.`
    : selectedOffices.length > 1
      ? `${selectedOffices.join(' · ')} 지방청을 각각 표시합니다. 시·도 단위 합계를 새로 산출하지 않습니다.`
      : `${selectedOffices.join(' · ')} 지방청 단위 수치입니다. 지도는 자료 탐색을 위한 지역 구분입니다.`;
  const sourceUrl = 'https://github.com/heechan9/triguard-ai/blob/main/data/' + encodeURIComponent(data.source);
  $('#dataGuide').innerHTML = `<div class="panel-title"><div><p class="eyebrow">DATA CHECK</p><h3 id="dataGuideTitle">자료 확인 안내</h3></div><span>${esc(name)} · ${esc($('#year').value)}년</span></div><div class="data-guide-grid">
    <section><h4>자료 기준일</h4><p>선택 통계 연도: ${esc($('#year').value)}년</p><p>${esc(data.date_note)}</p><p>실시간 자료가 아니므로 최신 공식 자료와 비교해 확인하세요.</p></section>
    <section><h4>누락 여부</h4><p>${esc(completeness)}</p></section>
    <section><h4>관할 범위</h4><p>${esc(scope)}</p></section>
    <section><h4>원자료 확인</h4><p>연도·지방청·열 이름과 단위(명)를 대조하세요. 공식 배포 페이지와 이용조건은 별도 확인이 필요합니다.</p><a class="button ghost" href="${esc(sourceUrl)}">원본 CSV 열기</a></section>
  </div>`;
  $('#dataGuide').hidden = false;
}

function drawMap(geo) {
  const polygons = (g) => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const pairs = geo.features.flatMap((f) => polygons(f.geometry).flat(2));
  const bounds = pairs.reduce((b,[x,y]) => [Math.min(b[0],x),Math.max(b[1],x),Math.min(b[2],y),Math.max(b[3],y)], [Infinity,-Infinity,Infinity,-Infinity]);
  const lonFactor = Math.cos(36 * Math.PI / 180);
  const scale = Math.min(480 / ((bounds[1]-bounds[0])*lonFactor),580/(bounds[3]-bounds[2]));
  const xPad = (520-(bounds[1]-bounds[0])*lonFactor*scale)/2;
  const project = ([x,y]) => [xPad+(x-bounds[0])*lonFactor*scale,600-(y-bounds[2])*scale];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 520 620');
  svg.setAttribute('role','group');
  svg.setAttribute('aria-label','시도 선택. Tab 키로 이동하고 Enter 키로 선택하세요.');
  for (const f of geo.features) {
    const name = f.properties.name;
    const p = document.createElementNS(ns,'path');
    p.setAttribute('d',polygons(f.geometry).map((poly) => poly.map((ring) => ring.map((point,i) => `${i?'L':'M'}${project(point).join(' ')}`).join(' ')+' Z').join(' ')).join(' '));
    p.setAttribute('class','province'); p.setAttribute('fill-rule','evenodd');
    p.dataset.province = name; p.setAttribute('tabindex','0'); p.setAttribute('role','button');
    p.setAttribute('aria-label',name+' 공개 통계 보기');
    const title = document.createElementNS(ns,'title'); title.textContent = name; p.append(title);
    p.addEventListener('click',() => selectRegion(name));
    p.addEventListener('keydown',(e) => {if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(name);}});
    svg.append(p);
  }
  $('#publicMap').replaceChildren(svg);
}

function renderYear() {
  const rows = yearRows();
  $('#statisticsTable').innerHTML = rows.map((r) => `<tr><th scope="row">${esc(r.office)}</th>${fields.map((f) => `<td>${count(r.values[f])}</td>`).join('')}</tr>`).join('');
  $('#tableTitle').textContent = `${$('#year').value}년 지방청별 원자료 · 단위: 명`;
  $('#download').href = `/downloads/triguard-statistics-${$('#year').value}.csv`;
  $('#download').setAttribute('download', `triguard-statistics-${$('#year').value}.csv`);
  $('#download').hidden = false;
  selectRegion(selected);
}

async function load() {
  $('#retry').hidden = true;
  $('#loadStatus').textContent = '통계를 불러오는 중입니다.';
  try {
    const responses = await Promise.all(['/data/statistics.json','/data/korea_provinces.json'].map((u) => fetch(u)));
    if(responses.some((r) => !r.ok)) throw new Error('자료 응답 오류');
    const [snapshot,geo] = await Promise.all(responses.map((r) => r.json()));
    if(!snapshot.rows?.length || !geo.features?.length) throw new Error('자료가 비어 있습니다.');
    data = snapshot;
    $('#year').innerHTML = [...new Set(data.rows.map((r) => r.year))].sort((a,b) => b-a).map((y) => `<option>${y}</option>`).join('');
    $('#province').innerHTML = geo.features.map((f) => `<option>${esc(f.properties.name)}</option>`).join('');
    $('#year').disabled = $('#province').disabled = false;
    $('#sourceDate').textContent = data.date_note;
    $('#sourceName').textContent = data.source;
    $('#sourceLink').href = 'https://github.com/heechan9/triguard-ai/blob/main/data/'+encodeURIComponent(data.source);
    const initial = DashboardState.read(location.search,geo.features.map(f=>f.properties.name),[...new Set(data.rows.map(r=>r.year))].sort((a,b)=>b-a));
    selected=initial.region; $('#year').value=String(initial.year);
    drawMap(geo); renderYear();
    activateTab(document.getElementById('tab-'+initial.tab));
    loadValidationReport();
    $('#loadStatus').textContent = '17개 시·도 · 2019–2025년 자료';
  } catch (error) {
    $('#loadStatus').textContent = '자료를 불러오지 못했습니다. 다시 시도해 주세요.';
    $('#mapDetail').textContent = '자료 연결을 확인한 뒤 다시 불러오기를 눌러 주세요.';
    $('#retry').hidden = false;
    console.error(error);
  }
}
$('#year').addEventListener('change',renderYear);
$('#province').addEventListener('change',(e) => selectRegion(e.target.value));
$('#retry').addEventListener('click',load);
load();

let agencyData = [];
let agencyPage = 0;
const agencyPageSize = 20;
function renderAgency() {
  const d = agencyData[Number($('#agencyDataset').value)];
  if (!d) return;
  const query = $('#agencySearch').value.trim().toLocaleLowerCase('ko-KR');
  const rows = d.rows.filter(r => r.some(v => String(v).toLocaleLowerCase('ko-KR').includes(query)));
  const pages = Math.max(1, Math.ceil(rows.length / agencyPageSize));
  agencyPage = Math.min(agencyPage, pages - 1);
  $('#agencyTitle').textContent = d.source.replace(/\.csv$/, '');
  $('#agencyNote').textContent = (d.metadata?.unit ? '공식 조회와 대조한 열 제목입니다. ' : d.note + ' ') + (d.metadata ? d.metadata.note : '');
  $('#agencySummary').textContent = `원본 ${d.source_rows.toLocaleString('ko-KR')}행 · 조회 표 ${d.rows.length.toLocaleString('ko-KR')}행 · 검색 결과 ${rows.length.toLocaleString('ko-KR')}행`;
  $('#agencySource').href = 'https://github.com/heechan9/triguard-ai/blob/main/data/' + encodeURIComponent(d.source);
  $('#agencySource').hidden = false;
  $('#agencyMetadata').innerHTML = d.metadata ? `<p>${esc(d.metadata.status)}</p>${d.metadata.evidence_url ? `<p><a href="${esc(d.metadata.evidence_url)}">공식 수치 대조 기록 확인</a></p>` : ''}<a href="${esc(d.metadata.reference_url)}">질병청 공식 통계 화면 · 보관 CSV와 선택 조건은 별도 확인</a>` : d.supplier_regions ? `<p>${esc(d.supplier_regions.note)} 미분류 ${count(d.supplier_regions.unclassified)}행 / 전체 ${count(d.supplier_regions.total)}행</p>` : d.extra_kind ? `<p>${esc(d.period_note)}</p>` : '<p>원본에 지역 주소 열이 없어 지역별로 배분하지 않습니다.</p>';
  $('#agencyHead').innerHTML = '<tr>' + d.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('') + '</tr>';
  $('#agencyBody').innerHTML = rows.slice(agencyPage * agencyPageSize, (agencyPage + 1) * agencyPageSize).map(r => '<tr>' + r.map(v => `<td>${v === '' ? '<span class="missing">자료 없음</span>' : esc(v)}</td>`).join('') + '</tr>').join('') || `<tr><td colspan="${d.columns.length}">검색 결과가 없습니다.</td></tr>`;
  $('#agencyPage').textContent = `${agencyPage + 1} / ${pages} 페이지 · 페이지당 ${agencyPageSize}행`;
  $('#agencyPrev').disabled = agencyPage === 0;
  $('#agencyNext').disabled = agencyPage >= pages - 1;
  if (window.renderAgencyInspector) window.renderAgencyInspector();
}
async function loadAgencies() {
  $('#agencyRetry').hidden = true;
  try {
    const response = await fetch('/data/agencies.json');
    if (!response.ok) throw new Error('기관 자료 응답 오류');
    const snapshot = await response.json();
    if (!snapshot.datasets?.length) throw new Error('기관 자료 없음');
    agencyData = snapshot.datasets;
    $('#agencyDataset').innerHTML = agencyData.map((d, i) => `<option value="${i}">${esc(d.source.replace(/\.csv$/, ''))}</option>`).join('');
    $('#agencyDataset').disabled = $('#agencySearch').disabled = false;
    agencyPage = 0; renderAgency(); renderIntegrated();
  } catch (error) {
    agencyData = []; renderIntegrated();
    $('#agencyTitle').textContent = '기관 자료를 불러오지 못했습니다.';
    $('#agencyNote').textContent = '다시 불러오기를 눌러 주세요.';
    $('#agencyRetry').hidden = false;
    console.error(error);
  }
}
$('#agencyDataset').addEventListener('change', () => { agencyPage = 0; $('#agencySearch').value = ''; renderAgency(); });
$('#agencySearch').addEventListener('input', () => { agencyPage = 0; renderAgency(); });
$('#agencyPrev').addEventListener('click', () => { agencyPage--; renderAgency(); });
$('#agencyNext').addEventListener('click', () => { agencyPage++; renderAgency(); });
$('#agencyRetry').addEventListener('click', loadAgencies);
loadAgencies();

function renderIntegrated() {
  if (!data) return;
  const review = buildDataReview(data, agencyData, validationReport, $('#year').value, selected, offices);
  $('#integratedSummary').innerHTML = `<div class="panel-title"><div><p class="eyebrow">INTEGRATED DATA REVIEW</p><h3>${esc(review.related.join(' · '))} 통합 자료 점검</h3></div><strong>${review.passed} / ${review.checks.length}개 확인</strong></div><p>자료 연결·누락·출처·시점의 확인 항목 수입니다. 공통 기준일과 단위는 확인되지 않았습니다.</p><div class="review-checks">${review.checks.map(c=>`<p><b>${c.ok ? '확인' : '확인 필요'}</b> · ${esc(c.label)}</p>`).join('')}</div>`;
  const sourceLink = d => d ? `<a href="https://github.com/heechan9/triguard-ai/blob/main/data/${encodeURIComponent(d.source)}">원본 CSV 확인</a>` : '';
  const regionLabel = review.related.join(' · ');
  $('#regionContext').textContent = `현재 선택: ${regionLabel} · 병무청 ${$('#year').value}년 | 모든 탭이 이 권역에 연결됩니다.`;
  $('#analysisTitle').textContent = `${regionLabel} · 분석 결과`;
  $('#detailsTitle').textContent = `${regionLabel} · 상세 정보`;
  $('#guideTitle').textContent = `${regionLabel} · 데이터 보완 안내`;
  const healthSummary = review.health.map(r => `<p><b>${esc(r[0])}</b> · 원자료 3열 ${esc(r[2] || '자료 없음')} · 4열 ${esc(r[3] || '자료 없음')}</p>`).join('') || '<p>선택 지역에 연결된 자료가 없습니다.</p>';
  const supplierSummary = review.supplierRows.map(r=>`<p><b>${esc(r.region)}</b> · 국내 계약 기록 ${count(r.count)}행</p>`).join('');
  const healthCard = `<section class="office-detail"><h4>질병관리청 · ${esc(regionLabel)}</h4>${healthSummary}<p>지역별 원본 값 · 질병 열 이름·단위·기간 미확인</p><button type="button" data-open-tab="details">선택 지역의 전체 수치 보기</button>${sourceLink(review.regional)}</section>`;
  const supplierCard = `<section class="office-detail"><h4>방위사업청 · ${esc(regionLabel)}</h4>${supplierSummary}<p>대표업체 소재지 기준 · 국내조달 원본 전체 기간 · 납품 지역 아님</p>${sourceLink(review.procurement.find(d=>d.supplier_regions))}<details><summary>전국 공통 자료</summary>${review.procurement.filter(d=>!d.supplier_regions).map(d=>`<p>${esc(d.source.includes('입찰')?'입찰 참여':'국외 계약')} 기록 ${count(d.source_rows)}행</p>`).join('')}<p>지역 연결 키가 없어 전국 자료로 표시합니다.</p></details></section>`;
  const extraCards = review.extra.map(d=>`<section class="office-detail"><h4>${esc(d.source.replace(/_202\d+|\.csv/g,''))}</h4><p>${esc(d.period_note)}</p>${d.extra_kind==='catalog' ? `<p>전국 공통 목록 ${count(d.source_rows)}행</p><button type="button" data-source="${esc(d.source)}">품목 목록 조회</button>` : d.selectedRows.map(r=>`<p><b>${esc(r[0])}</b> · ${esc(d.columns[1])}: ${esc(r[1])}</p>`).join('') || '<p>선택 지역 자료 없음</p>'}${sourceLink(d)}</section>`).join('');
  const extraDetails = review.extra.filter(d=>d.extra_kind!=='catalog').map(d=>`<details class="office-detail compact-source"><summary>${esc(d.source.replace(/_202\d+|\.csv/g,''))} · 상세 수치 펼치기</summary><p>${esc(d.note)}</p><div class="table-wrap"><table class="regional-values"><thead><tr><th>원본 항목</th>${d.selectedRows.map(r=>`<th>${esc(r[0])}</th>`).join('')}</tr></thead><tbody>${d.columns.slice(1).map((c,i)=>`<tr><th>${esc(c)}</th>${d.selectedRows.map(r=>`<td>${esc(r[i+1] || '자료 없음')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${sourceLink(d)}</details>`).join('');
  $('#agencyCards').innerHTML = healthCard + supplierCard + extraCards;
  const healthTable = review.regional && review.health.length ? `<table class="regional-values"><caption>${esc(regionLabel)} · 질병청 원본 값</caption><thead><tr><th scope="col">원본 항목</th>${review.health.map(r=>`<th scope="col">${esc(r[0])}</th>`).join('')}</tr></thead><tbody>${review.regional.columns.slice(2).map((c,i)=>`<tr><th scope="row">${esc(c)}</th>${review.health.map(r=>`<td>${esc(r[i+2] === '' ? '자료 없음' : r[i+2])}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>선택 지역의 질병청 자료가 없습니다. 전체 원자료 영역에서 연결을 확인하세요.</p>';
  $('#regionalHealth').innerHTML = healthTable;
  $('#regionalAnalysis').innerHTML = `<div class="regional-analysis"><section><h4>병무청 · ${esc($('#year').value)}년</h4><p>${review.rows.map(r=>esc(r.office)).join(' · ')}: ${review.present}/${review.expected}개 항목 확인</p></section><section><h4>질병관리청</h4><p>${review.health.map(r=>esc(r[0])).join(' · ') || '미연결'}: ${review.health.length}/${review.related.length}개 시·도 요약행 연결</p></section><section><h4>방위사업청</h4>${supplierSummary}</section></div>`;
  const mmaDetails = review.rows.map(r=>`<section class="office-detail"><h4>병무청 · ${esc(r.office)} · ${esc($('#year').value)}년</h4><dl class="regional-mma">${fields.map(f=>`<div><dt>${esc(f)}</dt><dd>${count(r.values[f])}명</dd></div>`).join('')}</dl></section>`).join('') || '<p>선택 연도·지역의 병무청 자료가 없습니다.</p>';
  $('#regionalDetails').innerHTML = mmaDetails + `<section class="office-detail"><h4>질병관리청 · ${esc(regionLabel)}</h4><p>단위·기간 미확인. 빈 칸은 0이 아닙니다.</p>${healthTable}</section>` + supplierCard;
  $('#regionalDetails').innerHTML += extraDetails;
  $('#regionalAnalysis').innerHTML += extraCards;
  const advice = [`${regionLabel}: 병무청 ${$('#year').value}년 ${review.rows.map(r=>r.office).join(' · ') || '미연결'} 관할 자료 ${review.present}/${review.expected}개 값 확인.`, `${regionLabel}: 질병청 ${review.health.map(r=>r[0]).join(' · ') || '미연결'} 요약행 ${review.health.length}개를 대조하세요.`, ...review.supplierRows.map(r=>`${r.region}: 대표업체 소재지 기준 국내 계약 기록 ${count(r.count)}행. 선택 연도별 계약 수나 납품 지역으로 해석하지 마세요.`)];
  if (!review.checks[0].ok) advice.push('병무청 선택 연도와 지방청의 누락 행·항목을 원본 CSV와 대조하세요.');
  if (!review.checks[1].ok) advice.push('질병청 시·도 이름 매핑과 방위사업청 3개 파일의 연결을 확인하세요.');
  if (!review.checks[2].ok) advice.push('배포 보고서와 표시 자료의 출처 식별정보를 확인하세요. 자료 로딩 실패 시 상세 정보에서 다시 불러오세요.');
  advice.push('질병청 원본의 열 제목·단위·기간을 확보한 뒤 해당 열에 연결하세요. 빈 셀은 0으로 바꾸지 마세요.');
  advice.push('기관별 공식 기준일을 확인하세요. 파일명 날짜와 병무청 선택 연도를 다른 기관 자료의 기준일로 적용하지 마세요.');
  advice.push(review.supplier ? `국내조달은 대표업체 주소로 지역을 연결했습니다. 미분류 ${review.supplier.unclassified}행은 원본 주소를 보완해야 합니다. 업체 소재지를 납품 지역으로 해석하지 마세요.` : '국내조달 대표업체 주소의 연결을 확인하세요.');
  advice.push('국외 계약과 입찰 참여 자료에는 주소 열이 없어 전국 집계로 표시합니다.');
  review.extra.forEach(d=>advice.push(`${d.source}: ${d.note}`));
  $('#integratedAdvice').innerHTML = advice.map(a=>`<li>${esc(a)}</li>`).join('');
  if (window.renderSourceInventory) window.renderSourceInventory();
  if (!agencyData.length && window.renderAgencyInspector) window.renderAgencyInspector();
}
const dashboardTabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  dashboardTabs.forEach(t => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
  });
  if (window.syncDashboardURL) window.syncDashboardURL();
}
dashboardTabs.forEach((tab,i) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (i+1)%dashboardTabs.length;
    if (event.key === 'ArrowLeft') next = (i+dashboardTabs.length-1)%dashboardTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = dashboardTabs.length-1;
    if (next !== undefined) { event.preventDefault(); activateTab(dashboardTabs[next]); dashboardTabs[next].focus(); }
  });
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-open-tab]');
  if (!button) return;
  const tab = document.getElementById('tab-' + button.dataset.openTab);
  if (tab) { activateTab(tab); tab.focus(); }
});

function renderResearch() {
  if (!researchScores || !data) return;
  const rows = researchScores.regions.filter(r=>(offices[selected] || []).includes(r.지방청));
  const date = researchScores.generated_at.slice(0,10);
  const scoreCards = rows.map(r=>`<section class="research-kpi"><h4>${esc(r.지방청)} 지방청</h4><strong>${r.통합Risk.toFixed(2)}<small> / 100</small></strong><p>기존 분류: ${esc(r.위험등급)}</p></section>`).join('') || '<p>이 지역의 기존 연구 결과가 없습니다.</p>';
  $('#researchScore').innerHTML = `<p class="eyebrow">TRIGUARD RESEARCH INDEX</p><h3>${esc(selected)} · 통합 리스크 스코어</h3><div class="research-grid">${scoreCards}</div><p>인력 40% + 감염병 40% + 물자 20% · 생성일 ${esc(date)} · 고정 연구 스냅샷</p><p>병무청 선택 연도(${$('#year').value}년)와 별개입니다. 실제 위험 확률이나 검증된 예측값이 아닙니다.</p><details><summary>계산 근거와 한계</summary><ul>${researchScores.limitations.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><p>기존 분류 경계: 정상 35 미만 · 주의 35 이상 60 미만 · 위험 60 이상. 연구자가 설정한 기준입니다.</p><p>결과 파일 SHA-256: <code class="source-hash">${esc(researchScores.source_sha256)}</code></p><p>생성 당시 입력 파일별 해시는 기록되어 있지 않습니다. 현재 조회 자료와 생성 당시 자료의 동일성은 미확인입니다.</p><a href="https://github.com/heechan9/triguard-ai/blob/main/web/data/risk_snapshot.json">기존 결과 원본</a> · <a href="https://github.com/heechan9/triguard-ai/blob/main/docs/RESEARCH_RESTORATION.md">계산 검토 기록</a></details>`;
  $('#mapRisk').innerHTML = `<h3>통합 리스크 · 기존 연구 결과</h3>${scoreCards}<p>생성일 ${esc(date)} · 고정 스냅샷 · 실제 위험 확률 아님</p>`;
  $('#researchAnalysis').innerHTML = rows.map(r=>`<section class="office-detail"><h4>${esc(r.지방청)} · 기존 점수 구성</h4><dl class="regional-mma">${[['인력Risk','인력',.4],['감염병DC','감염병',.4],['물자Risk','물자(전국 공통)',.2]].map(([key,label,w])=>`<div><dt>${label} · ${w*100}%</dt><dd>${r[key].toFixed(2)}</dd><p>가중 기여 ${(r[key]*w).toFixed(2)}점</p></div>`).join('')}</dl></section>`).join('') + '<p>기존 계산 결과의 구성 설명입니다. 미확인 단위·기간을 포함해 지표 타당성은 추가 검증이 필요합니다.</p>';
  $('#responseTitle').textContent = `${selected} · 대응 추천 · 행정 점검`;
  $('#researchResponse').innerHTML = rows.map(r=>{
    const factors = [{name:'병무 행정',value:r.인력Risk*.4,tasks:['판정검사 인원 변화와 실제 입영 인원 변화를 구분해 원자료를 확인하세요.','예약·안내·서류 처리 과정의 지연 여부를 담당 부서의 실제 운영 기록으로 확인하세요.']},{name:'보건 정보',value:r.감염병DC*.4,tasks:['질병청 최신 공식 발생 동향과 자료 기간·단위를 먼저 대조하세요.','해당 지역 보건기관의 현행 예방 안내를 확인하고 대민 안내에 반영할지 검토하세요.']},{name:'조달 행정',value:r.물자Risk*.2,tasks:['계약 변경 차수와 중복 기록을 확인하고 계약방법별 집계를 검토하세요.','전국 조달 지표와 업체 소재지별 기록을 구분해 설명하세요.']}].sort((a,b)=>b.value-a.value);
    return `<section class="office-detail"><h4>${esc(r.지방청)} · 기존 분류 ${esc(r.위험등급)}</h4><p>기존 가중 기여가 가장 큰 항목: ${factors[0].name}. 아래는 담당자가 확인할 일반 업무 안내이며 자동 조치 지시가 아닙니다.</p>${factors.map(f=>`<h4>${f.name} 확인</h4><ul>${f.tasks.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`).join('')}</section>`;
  }).join('');
}
async function loadResearch() {
  $('#scoreRetry').hidden = true;
  try {
    const response = await fetch('/data/research_scores.json');
    if (!response.ok) throw new Error('연구 결과 응답 오류');
    const snapshot = await response.json();
    if (snapshot.regions?.length !== 14 || snapshot.regions.some(r=>!['인력Risk','감염병DC','물자Risk','통합Risk'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k])&&r[k]>=0&&r[k]<=100))) throw new Error('연구 결과 형식 오류');
    researchScores = snapshot; renderResearch();
  } catch (e) {
    researchScores = null;
    $('#researchScore').innerHTML = '<h3>통합 리스크 스코어</h3><p>기존 연구 결과를 불러오지 못했습니다. 0점으로 대체하지 않습니다.</p>';
    $('#scoreRetry').hidden = false;
  }
}
$('#scoreRetry').addEventListener('click',loadResearch);
loadResearch();

document.addEventListener('click', event=>{
  const button = event.target.closest('[data-source]');
  if (!button) return;
  const index = agencyData.findIndex(d=>d.source===button.dataset.source);
  if (index<0) return;
  $('#agencyDataset').value=String(index); $('#agencySearch').value=''; agencyPage=0; renderAgency();
  activateTab($('#tab-details')); document.querySelector('.all-source').open=true;
  $('#agencyDataset').focus(); $('#agencies').scrollIntoView({block:'start'});
});
