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
let selected = '서울특별시';
const count = (v) => Number(v).toLocaleString('ko-KR');
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
