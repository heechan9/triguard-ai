const number = (value) => Number(value ?? 0).toFixed(1);
const badgeClass = (grade) => grade === "위험" ? "danger" : grade === "주의" ? "caution" : "normal";
const gradeFromScore = (score) => score >= 60 ? "위험" : score >= 35 ? "주의" : "정상";

const officeToProvince = {
  서울: ["서울특별시"], 부산울산: ["부산광역시", "울산광역시"],
  대구경북: ["대구광역시", "경상북도"], 경인: ["경기도"], 경기북부: ["경기도"],
  광주전남: ["광주광역시", "전라남도"], 대전충남: ["대전광역시", "충청남도", "세종특별자치시"],
  강원: ["강원도"], 강원영동: ["강원도"], 충북: ["충청북도"], 전북: ["전라북도"],
  경남: ["경상남도"], 제주: ["제주특별자치도"], 인천: ["인천광역시"],
};

async function loadData() {
  const [snapshotResponse, geoResponse] = await Promise.all([
    fetch("/data/risk_snapshot.json"), fetch("/data/korea_provinces.json"),
  ]);
  if (!snapshotResponse.ok) throw new Error(`snapshot ${snapshotResponse.status}`);
  if (!geoResponse.ok) throw new Error(`geojson ${geoResponse.status}`);
  return [await snapshotResponse.json(), await geoResponse.json()];
}

function provinceRows(regions) {
  const buckets = new Map();
  regions.forEach((row) => (officeToProvince[row.지방청] || []).forEach((province) => {
    if (!buckets.has(province)) buckets.set(province, []);
    buckets.get(province).push(row);
  }));
  return new Map([...buckets].map(([province, rows]) => {
    const mean = (key) => rows.reduce((sum, row) => sum + Number(row[key]), 0) / rows.length;
    const score = mean("통합Risk");
    return [province, {
      province, offices: rows.map((row) => row.지방청).sort(), score,
      grade: gradeFromScore(score), manpower: mean("인력Risk"),
      disease: mean("감염병DC"), material: mean("물자Risk"),
    }];
  }));
}

function coordinatePairs(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flat());
}

function renderMap(snapshot, geojson) {
  const rows = provinceRows(snapshot.regions);
  const allPairs = geojson.features.flatMap((feature) => coordinatePairs(feature.geometry));
  const xs = allPairs.map(([x]) => x); const ys = allPairs.map(([, y]) => y);
  const bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const width = 520; const height = 620; const pad = 18;
  const scale = Math.min((width - pad * 2) / (bounds.maxX - bounds.minX), (height - pad * 2) / (bounds.maxY - bounds.minY));
  const project = ([x, y]) => [pad + (x - bounds.minX) * scale, height - pad - (y - bounds.minY) * scale];
  const ringPath = (ring) => ring.map((point, index) => `${index ? "L" : "M"}${project(point).join(" ")}`).join(" ") + " Z";
  const geometryPath = (geometry) => {
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    return polygons.map((polygon) => polygon.map(ringPath).join(" ")).join(" ");
  };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "대한민국 시도별 통합 위험도 지도");
  geojson.features.forEach((feature) => {
    const name = feature.properties.name;
    const row = rows.get(name);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", geometryPath(feature.geometry));
    path.setAttribute("class", `province ${row ? badgeClass(row.grade) : "unmapped"}`);
    path.setAttribute("tabindex", "0");
    path.setAttribute("aria-label", row ? `${name}, 통합 위험도 ${number(row.score)}, ${row.grade}` : `${name}, 데이터 없음`);
    const select = () => row && renderMapDetail(row);
    path.addEventListener("click", select);
    path.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) { event.preventDefault(); select(); }
    });
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = row ? `${name} · ${row.offices.join(" / ")} · ${number(row.score)}` : `${name} · 데이터 없음`;
    path.appendChild(title); svg.appendChild(path);
  });
  document.querySelector("#riskMap").replaceChildren(svg);
  const initial = [...rows.values()].sort((a, b) => b.score - a.score)[0];
  if (initial) renderMapDetail(initial);
}

function renderMapDetail(row) {
  document.querySelector("#mapDetail").innerHTML = `
    <p class="eyebrow">SELECTED REGION</p>
    <div class="detail-head"><div><h3>${row.province}</h3><p>${row.offices.join(" / ")}</p></div><strong>${number(row.score)}</strong></div>
    <span class="badge ${badgeClass(row.grade)}">${row.grade}</span>
    <dl><div><dt>인력 Risk</dt><dd>${number(row.manpower)}</dd></div><div><dt>감염병 DC</dt><dd>${number(row.disease)}</dd></div><div><dt>물자 Risk</dt><dd>${number(row.material)}</dd></div></dl>`;
}

function render(snapshot, geojson) {
  const s = snapshot.summary;
  const cards = [["분석 지방청", `${s.regions}개`], ["위험", `${s.danger}개`], ["주의", `${s.caution}개`], ["정상", `${s.normal}개`]];
  document.querySelector("#kpis").innerHTML = cards.map(([label, value]) => `<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`).join("");
  document.querySelector("#riskBars").innerHTML = snapshot.regions.map((row) => `<div class="risk-row"><span>${row.지방청}</span><div class="track"><div class="fill ${badgeClass(row.위험등급)}" style="width:${Math.min(Number(row.통합Risk), 100)}%"></div></div><strong>${number(row.통합Risk)}</strong></div>`).join("");
  document.querySelector("#topRegions").innerHTML = snapshot.regions.slice(0, 3).map((row, index) => `<div class="top-item"><span class="rank">${index + 1}</span><div><strong>${row.지방청}</strong><small>${row.위험등급} · 우선 검토</small></div><span class="score">${number(row.통합Risk)}</span></div>`).join("");
  document.querySelector("#riskTable").innerHTML = snapshot.regions.map((row, index) => `<tr><td>${index + 1}</td><td><strong>${row.지방청}</strong></td><td>${number(row.통합Risk)}</td><td>${number(row.인력Risk)}</td><td>${number(row.감염병DC)}</td><td>${number(row.물자Risk)}</td><td><span class="badge ${badgeClass(row.위험등급)}">${row.위험등급}</span></td></tr>`).join("");
  document.querySelector("#claimBoundary").textContent = snapshot.claim_boundary;
  document.querySelector("#generatedAt").textContent = `생성 시각 ${new Date(snapshot.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
  renderMap(snapshot, geojson);
}

loadData().then(([snapshot, geojson]) => render(snapshot, geojson)).catch((error) => {
  document.querySelector("#generatedAt").textContent = "결과 스냅샷을 불러오지 못했습니다.";
  console.error(error);
});
