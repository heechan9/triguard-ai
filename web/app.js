const number = (value) => Number(value ?? 0).toFixed(1);
const badgeClass = (grade) => grade === "위험" ? "danger" : grade === "주의" ? "caution" : "normal";

async function loadSnapshot() {
  const response = await fetch("/data/risk_snapshot.json");
  if (!response.ok) throw new Error(`snapshot ${response.status}`);
  return response.json();
}

function render(snapshot) {
  const s = snapshot.summary;
  const cards = [
    ["분석 지방청", `${s.regions}개`], ["위험", `${s.danger}개`],
    ["주의", `${s.caution}개`], ["정상", `${s.normal}개`],
  ];
  document.querySelector("#kpis").innerHTML = cards.map(([label, value]) =>
    `<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`).join("");

  document.querySelector("#riskBars").innerHTML = snapshot.regions.map((row) =>
    `<div class="risk-row"><span>${row.지방청}</span><div class="track"><div class="fill" style="width:${Math.min(Number(row.통합Risk),100)}%"></div></div><strong>${number(row.통합Risk)}</strong></div>`).join("");

  document.querySelector("#topRegions").innerHTML = snapshot.regions.slice(0, 3).map((row, index) =>
    `<div class="top-item"><span class="rank">${index + 1}</span><div><strong>${row.지방청}</strong><small>${row.위험등급} · 우선 검토</small></div><span class="score">${number(row.통합Risk)}</span></div>`).join("");

  document.querySelector("#riskTable").innerHTML = snapshot.regions.map((row, index) =>
    `<tr><td>${index + 1}</td><td><strong>${row.지방청}</strong></td><td>${number(row.통합Risk)}</td><td>${number(row.인력Risk)}</td><td>${number(row.감염병DC)}</td><td>${number(row.물자Risk)}</td><td><span class="badge ${badgeClass(row.위험등급)}">${row.위험등급}</span></td></tr>`).join("");

  document.querySelector("#claimBoundary").textContent = snapshot.claim_boundary;
  document.querySelector("#generatedAt").textContent = `생성 시각 ${new Date(snapshot.generated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`;
}

loadSnapshot().then(render).catch((error) => {
  document.querySelector("#generatedAt").textContent = "결과 스냅샷을 불러오지 못했습니다.";
  console.error(error);
});
