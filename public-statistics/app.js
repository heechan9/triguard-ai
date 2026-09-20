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
    drawMap(geo); renderYear();
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
  $('#agencyMetadata').innerHTML = d.metadata ? `<p>${esc(d.metadata.status)}</p>${d.metadata.evidence_url ? `<p><a href="${esc(d.metadata.evidence_url)}">공식 수치 대조 기록 확인</a></p>` : ''}<a href="${esc(d.metadata.reference_url)}">질병청 공식 통계 화면 · 보관 CSV와 선택 조건은 별도 확인</a>` : d.supplier_regions ? `<p>${esc(d.supplier_regions.note)} 미분류 ${count(d.supplier_regions.unclassified)}행 / 전체 ${count(d.supplier_regions.total)}행</p>` : '<p>원본에 지역 주소 열이 없어 지역별로 배분하지 않습니다.</p>';
  $('#agencyHead').innerHTML = '<tr>' + d.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('') + '</tr>';
  $('#agencyBody').innerHTML = rows.slice(agencyPage * agencyPageSize, (agencyPage + 1) * agencyPageSize).map(r => '<tr>' + r.map(v => `<td>${v === '' ? '<span class="missing">자료 없음</span>' : esc(v)}</td>`).join('') + '</tr>').join('') || `<tr><td colspan="${d.columns.length}">검색 결과가 없습니다.</td></tr>`;
  $('#agencyPage').textContent = `${agencyPage + 1} / ${pages} 페이지 · 페이지당 ${agencyPageSize}행`;
  $('#agencyPrev').disabled = agencyPage === 0;
  $('#agencyNext').disabled = agencyPage >= pages - 1;
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
  $('#agencyCards').innerHTML = `<article class="data-guide"><h3>병무청 · ${esc($('#year').value)}년</h3><p>${review.present} / ${review.expected}개 값 있음 · 단위 명</p>${review.rows.map(r=>`<p><b>${esc(r.office)}</b> · 처분인원 ${count(r.values['처분인원'])}명</p>`).join('') || '<p>선택 연도 자료 없음</p>'}${sourceLink(data)}</article><article class="data-guide"><h3>질병관리청 · 선택 권역</h3><p>${review.health.length}개 시·도 요약행 연결 · 기간·단위 미확인</p>${review.health.map(r=>`<p><b>${esc(r[0])}</b> · 원자료 3열 ${esc(r[2] || '자료 없음')} · 4열 ${esc(r[3] || '자료 없음')}</p>`).join('') || '<p>연결된 지역 자료 없음</p>'}<p>전체 열은 분석 결과 탭에서 확인합니다.</p>${sourceLink(review.regional)}</article><article class="data-guide"><h3>방위사업청 · 업체 소재지</h3>${review.supplierRows.map(r=>`<p><b>${esc(r.region)}</b> · 국내 계약 ${count(r.count)}행</p>`).join('')}<p>대표업체 소재지 기준 · 원본 전체 기간 · 납품 지역 아님</p><details><summary>전국 집계와 분류 범위</summary>${review.procurement.map(d=>`<p>${esc(d.source.includes('입찰') ? '입찰 참여 기록' : d.source.includes('국외') ? '국외 계약 기록' : '국내 계약 기록')} <b>${count(d.source_rows)}행</b></p>`).join('') || '<p>자료 연결 확인 필요</p>'}<p>국외 계약·입찰 참여 기록은 전국 집계입니다. 국내 계약 주소 미분류 ${count(review.supplier?.unclassified)}행.</p></details></article>`;
  $('#regionalHealth').innerHTML = review.regional && review.health.length ? `<table><caption>${esc(review.related.join(' · '))} · 원자료 열별 값</caption><thead><tr>${review.regional.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${review.health.map(r=>'<tr>'+r.map(v=>`<td>${esc(v === '' ? '자료 없음' : v)}</td>`).join('')+'</tr>').join('')}</tbody></table>` : '<p>지역 원자료가 연결되지 않았습니다. 상세 정보에서 기관 자료 다시 불러오기를 확인하세요.</p>';
  const advice = [];
  if (!review.checks[0].ok) advice.push('병무청 선택 연도와 지방청의 누락 행·항목을 원본 CSV와 대조하세요.');
  if (!review.checks[1].ok) advice.push('질병청 시·도 이름 매핑과 방위사업청 3개 파일의 연결을 확인하세요.');
  if (!review.checks[2].ok) advice.push('배포 보고서와 표시 자료의 출처 식별정보를 확인하세요. 자료 로딩 실패 시 상세 정보에서 다시 불러오세요.');
  advice.push('질병청 원본의 열 제목·단위·기간을 확보한 뒤 해당 열에 연결하세요. 빈 셀은 0으로 바꾸지 마세요.');
  advice.push('기관별 공식 기준일을 확인하세요. 파일명 날짜와 병무청 선택 연도를 다른 기관 자료의 기준일로 적용하지 마세요.');
  advice.push(review.supplier ? `국내조달은 대표업체 주소로 지역을 연결했습니다. 미분류 ${review.supplier.unclassified}행은 원본 주소를 보완해야 합니다. 업체 소재지를 납품 지역으로 해석하지 마세요.` : '국내조달 대표업체 주소의 연결을 확인하세요.');
  advice.push('국외 계약과 입찰 참여 자료에는 주소 열이 없어 전국 집계로 표시합니다.');
  $('#integratedAdvice').innerHTML = advice.map(a=>`<li>${esc(a)}</li>`).join('');
}
const dashboardTabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab) {
  dashboardTabs.forEach(t => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
  });
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
