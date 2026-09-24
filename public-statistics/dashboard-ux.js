'use strict';
(()=>{
  function shareURL(){return DashboardState.link(location.origin,location.pathname,selected,$('#year').value,document.querySelector('[role="tab"][aria-selected="true"]').id.replace('tab-',''));}
  window.syncDashboardURL=()=>{if(!data)return;const url=shareURL();history.replaceState(null,'',url);$('#shareURL').value=url;$('#reportPreview').hidden=true;$('#reportPrint').disabled=true;};
  $('#copyShare').addEventListener('click',async()=>{if(!data)return;const url=shareURL();$('#shareURL').value=url;try{await navigator.clipboard.writeText(url);$('#shareStatus').textContent='현재 지역·연도·탭 링크를 복사했습니다.';}catch{ $('#shareURL').focus();$('#shareURL').select();$('#shareStatus').textContent='아래 링크를 직접 복사하세요.';}});
  function prepareReport(){
    if(!data){$('#shareStatus').textContent='통계 자료를 먼저 불러와 주세요.';return false;}
    const review=buildDataReview(data,agencyData,validationReport,$('#year').value,selected,offices);
    const sourceURL=name=>'https://github.com/heechan9/triguard-ai/blob/main/data/'+encodeURIComponent(name);
    const table=(columns,rows)=>`<div class="report-table-wrap"><table><thead><tr>${columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>{const numeric=typeof v==='number'||(typeof v==='string'&&/^-?\d[\d,]*(?:\.\d+)?$/.test(v));return `<${i?'td':'th scope="row"'}${numeric?' class="report-number"':''}>${esc(v??'자료 없음')}</${i?'td':'th'}>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
    const extra=review.extra.filter(d=>d.extra_kind!=='catalog').map(d=>`<h3>${esc(d.source)}</h3><p>${esc(d.note)}</p>${table(['항목',...d.selectedRows.map(r=>r[0])],d.columns.slice(1).map((c,i)=>[c,...d.selectedRows.map(r=>r[i+1]||'자료 없음')]))}` ).join('');
    const health=review.regional&&review.health.length?table(['원본 항목',...review.health.map(r=>r[0])],review.regional.columns.slice(2).map((c,i)=>[c,...review.health.map(r=>r[i+2]||'자료 없음')])):'<p>질병청 지역 자료를 불러오지 못했습니다.</p>';
    const scores=researchScores?.regions.filter(r=>(offices[selected]||[]).includes(r.지방청))||[];
    $('#reportPreview').innerHTML=`<h1>TriGuard 지역 공개 통계 보고서</h1><p>${esc(review.related.join(' · '))} · 병무청 ${esc($('#year').value)}년</p><p>보고서 생성: ${esc(new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}))} (한국시간)</p><p>자료 조회 링크: <a href="${esc(shareURL())}">${esc(shareURL())}</a></p><h2>병역판정검사 원본 · 명</h2>${table(['항목',...review.rows.map(r=>r.office+' 지방청')],fields.map(f=>[f,...review.rows.map(r=>count(r.values[f]))]))}<h2>보관된 연구 결과</h2><p>${researchScores?'생성일 '+esc(researchScores.generated_at)+' · 고정 결과 · 실제 위험 확률 아님':'연구 결과 미로딩'}</p>${table(['지방청','통합 점수','기존 분류'],scores.map(r=>[r.지방청,r.통합Risk,r.위험등급]))}<p>현재 연결 자료로 다시 계산한 점수가 아닙니다. 생성 당시 입력 파일별 해시가 기록되지 않아 현재 자료와의 동일성은 미확인입니다.</p><h2>행안부·병무청 추가 자료</h2>${extra}<h2>질병청 지역 자료</h2><p>열별 질병명·단위·기간 미확인. 서로 다른 열을 합산하지 않습니다.</p>${health}<h2>국내조달 대표업체 소재지별 기록</h2>${table(['지역','원본 전체 기간 기록 수'],review.supplierRows.map(r=>[r.region,r.count]))}<p>납품 지역·고유 계약 수가 아닙니다. 국외 계약·입찰 참여와 무역안보관리원 품목 목록은 전국 공통 자료입니다.</p><h2>자료 보완 및 출처</h2><p>기관 자료 ${agencyData.length}/11종 로드. 기관별 기간은 독립적입니다. 빈 셀과 누락 자료는 0이 아닙니다.</p><ul>${review.checks.map(c=>`<li>${c.ok?'확인':'확인 필요'}: ${esc(c.label)}</li>`).join('')}</ul><ul>${[data.source,...agencyData.map(d=>d.source)].map(s=>`<li><a href="${esc(sourceURL(s))}">${esc(s)}</a></li>`).join('')}</ul>`;
    $('#reportPreview').hidden=false;$('#reportPrint').disabled=false;return true;
  }
  $('#prepareReport').addEventListener('click',()=>{if(prepareReport())$('#reportPreview').scrollIntoView({block:'start'});});
  $('#reportPrint').addEventListener('click',()=>{if(prepareReport())window.print();});
  async function loadChanges(){
    $('#sourceChangesRetry').hidden=true;
    try {
      const response=await fetch('/data/source_changes.json');
      if(!response.ok)throw Error('missing');
      const log=await response.json();
      const states={unchanged:'동일',changed:'내용 변경',added:'추가',removed:'삭제'};
      if(!Array.isArray(log.files)||log.files.some(f=>!states[f.state]))throw Error('invalid');
      const changes=log.files.filter(f=>f.state!=='unchanged');
      $('#sourceChanges').innerHTML=`<p>원본 변경 감지 기준일: ${esc(log.baseline_date)} · 검사 시각: ${esc(log.checked_at)}</p><p>${Object.entries(states).map(([key,label])=>`${label} ${log.files.filter(f=>f.state===key).length}개`).join(' · ')}</p><p>${esc(log.baseline_note)}</p>${changes.length?`<ul>${changes.map(f=>`<li>${states[f.state]}: ${esc(f.source)}</li>`).join('')}</ul><p>변경된 자료의 기준일·열 구조·단위를 다시 확인하세요.</p>`:'<p>검토 기준과 파일 내용이 같습니다.</p>'}<a href="/data/source_changes.json" download="triguard-source-changes.json">원본 변경 대조 JSON 다운로드</a>`;
    }catch{ $('#sourceChanges').textContent='원본 변경 기록을 확인할 수 없습니다. 변경 없음으로 해석하지 마세요.';$('#sourceChangesRetry').hidden=false;}
  }
  $('#sourceChangesRetry').addEventListener('click',loadChanges);
  loadChanges();
  window.syncDashboardURL();
})();
