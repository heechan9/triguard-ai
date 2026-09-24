'use strict';
// Display provenance and coverage only; no scores are calculated here.
function publicContextRows(data, agencies, review, year) {
  const regional = review.regional;
  const supplier = review.procurement.find(d => d.supplier_regions);
  const rows = [
    {name:'병무청 · 병역판정검사', period:`${year}년`, scope:review.rows.map(r=>r.office).join(' · ') || '미연결', unit:'명', state:`${review.present}/${review.expected}개 값`, source:data.source},
    {name:'질병관리청 · 지역별 감염병', period:'원본 조회 기간 미확인', scope:review.health.map(r=>r[0]).join(' · ') || '미연결', unit:'열 제목·단위 확인 필요', state:`${review.health.length}/${review.related.length}개 지역행`, source:regional?.source},
    {name:'방위사업청 · 국내조달', period:'원본 전체 기간', scope:'선택 권역의 대표업체 소재지', unit:'계약 기록 행 · 납품 지역 아님', state:supplier?'연결됨':'미연결', source:supplier?.source},
  ];
  for (const d of review.extra.filter(d=>d.extra_kind!=='catalog')) rows.push({name:d.source.replace(/\.csv$/,''),period:d.period_note || '기준 기간 확인 필요',scope:d.selectedRows.map(r=>r[0]).join(' · ') || '미연결',unit:'원본 항목별 단위 참조',state:`${d.selectedRows.length}개 행`,source:d.source});
  return rows;
}
function renderPublicContext() {
  if (!data) return;
  const review=buildDataReview(data,agencyData,validationReport,$('#year').value,selected,offices);
  const rows=publicContextRows(data,agencyData,review,$('#year').value);
  const archive=researchScores ? `${new Date(researchScores.generated_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국시간)` : '결과 미로딩';
  $('#publicContext').innerHTML=`<p class="eyebrow">TRIGUARD / PUBLIC VIEW</p><h3>${esc(review.related.join(' · '))} · 조회 기준</h3><div class="public-context-grid"><section><h4>현재 조회 자료</h4><p>병역판정검사 ${esc($('#year').value)}년 · 기관별 기간은 아래에서 확인합니다.</p><p>공동 관할은 함께 표시하고 기관별 지역행은 구분합니다.</p></section><section><h4>보관된 연구 결과</h4><p>결과 생성: ${esc(archive)}</p><p>지역에 해당하는 보관 결과를 조회합니다. 연도 변경·CSV 업로드로 새로 계산되지 않습니다.</p></section></div><p>현재 조회 자료와 연구 생성 당시 입력 자료의 동일성은 미확인입니다. 결과 생성일은 통계 기준일이 아닙니다.</p><details><summary>지역별 자료 기간·범위·연결 상태</summary><ul class="context-source-list">${rows.map(r=>`<li><h4>${esc(r.name)}</h4><p>${esc(r.period)} · ${esc(r.scope)}</p><p>${esc(r.unit)} · ${esc(r.state)}</p>${r.source?`<button type="button" ${r.source===data.source?'data-open-tab="details"':`data-source="${esc(r.source)}"`}>원자료 상세 조회</button>`:''}</li>`).join('')}</ul><p>국외조달·입찰 참여·무역안보관리원 품목 목록은 전국 공통 자료로 별도 조회합니다.</p></details><div class="actions"><button type="button" data-open-tab="analysis">이 권역 분석 결과</button><button type="button" data-open-tab="details">이 권역 상세 정보</button><button type="button" data-open-tab="guide">이 권역 보완 안내</button></div>`;
}
if (typeof module!=='undefined') module.exports={publicContextRows};
