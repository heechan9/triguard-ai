'use strict';
(() => {
  let local=null, generation=0;
  const urls=new Map();
  const fmt=v=>v===null?'자료 없음':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2});
  function download(id,rows,name){const a=document.getElementById(id);if(urls.has(id))URL.revokeObjectURL(urls.get(id));const url=URL.createObjectURL(new Blob([StatisticsTools.csv(rows)],{type:'text/csv;charset=utf-8'}));urls.set(id,url);a.href=url;a.download=name;a.hidden=false;}
  function bars(rows,label,index){
    const values=rows.map(r=>StatisticsTools.numeric(r[index]));
    const max=Math.max(0,...values.filter(v=>v!==null));
    return `<div class="stat-bars">${rows.map((r,i)=>`<div class="stat-bar"><span>${esc(r[label])}</span><div><i style="width:${values[i]===null||max===0?0:Math.max(0,values[i])/max*100}%"></i></div><b>${fmt(values[i])}</b></div>`).join('')}</div>`;
  }
  function renderLocal(){
    if(!local)return;
    const index=Number($('#localColumn').value);
    const s=StatisticsTools.summary(local.rows,index);
    $('#localSummary').textContent=`${local.name} · ${local.rows.length.toLocaleString('ko-KR')}행 · 수치 ${s.count}개 · 빈 셀 ${s.missing}개 · 비수치 ${s.invalid}개 · 최솟값 ${fmt(s.min)} · 최댓값 ${fmt(s.max)} · 평균 ${fmt(s.mean)}`;
    $('#localPreview').innerHTML=`<table><caption>처음 20행 · 원본 값</caption><thead><tr>${local.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${local.rows.slice(0,20).map(r=>`<tr>${r.map(v=>`<td>${esc(v||'자료 없음')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('#localBars').innerHTML=bars(local.rows.slice(0,20),0,index);
    $('#localChartNote').textContent=`${local.columns[index]} · 처음 20행 · 0 이상 값의 상대 크기. 음수는 숫자로만 표시합니다. 단위는 원자료에서 확인하세요.`;
    download('localDownload',[local.columns,...local.rows],'triguard-local-data.csv');
    download('localSummaryDownload',[['자료','선택 열','전체 행','수치','빈 셀','비수치','최솟값','최댓값','평균'],[local.name,local.columns[index],local.rows.length,s.count,s.missing,s.invalid,s.min,s.max,s.mean]],'triguard-column-summary.csv');
  }
  function useLocal(dataset,name){local={...dataset,name};$('#localColumn').innerHTML=local.columns.map((c,i)=>`<option value="${i}">${esc(c)}</option>`).join('');$('#localColumn').value=String(Math.min(1,local.columns.length-1));$('#localColumn').disabled=false;$('#localError').textContent='';renderLocal();}
  function clearLocal(){local=null;$('#localColumn').innerHTML='';$('#localColumn').disabled=true;for(const id of ['localSummary','localPreview','localBars','localChartNote','localError'])$('#'+id).textContent='';for(const id of ['localDownload','localSummaryDownload']){if(urls.has(id))URL.revokeObjectURL(urls.get(id));urls.delete(id);$('#'+id).hidden=true;$('#'+id).removeAttribute('href');}}
  $('#localFile').addEventListener('change',async()=>{
    const current=++generation;clearLocal();const file=$('#localFile').files[0];if(!file)return;
    try {if(!/\.csv$/i.test(file.name)||file.size>5*1024*1024)throw Error('5MB 이하 CSV 파일을 선택하세요.');const buffer=await file.arrayBuffer();const text=new TextDecoder($('#localEncoding').value,{fatal:true}).decode(buffer);const parsed=StatisticsTools.parseCSV(text);if(current===generation)useLocal(parsed,file.name);}
    catch(e){if(current===generation)$('#localError').textContent=e.message;}
  });
  $('#localColumn').addEventListener('change',renderLocal);
  $('#clearLocal').addEventListener('click',()=>{generation++;$('#localFile').value='';clearLocal();});
  $('#generateSample').addEventListener('click',()=>{generation++;clearLocal();try{useLocal(StatisticsTools.simulate(Number($('#simSeed').value),Number($('#simBaseline').value),Number($('#simVariation').value)),'가상 행정 처리량 · 실제 지역 자료 아님');}catch(e){$('#localError').textContent=e.message;}});
  window.renderStatisticsWorkbench=()=>{
    if(!data)return;
    const field=$('#compareField').value;
    const year=Number($('#year').value);
    const all=data.rows.filter(r=>r.year===year&&r.office!=='전체');
    const comparison=all.map(r=>[r.office,r.values[field]]);
    $('#comparisonNote').textContent=`${year}년 · ${field} · 단위 명 · 지방청별 원본 수치. 인구 규모와 관할 범위가 달라 비율·위험도로 해석하지 않습니다.`;
    $('#comparisonChart').innerHTML=bars(comparison,0,1);
    const chosen=offices[selected]||[];
    const trend=data.rows.filter(r=>chosen.includes(r.office)).sort((a,b)=>a.year-b.year||a.office.localeCompare(b.office));
    $('#trendTitle').textContent=`${selected} · 연도별 ${field}`;
    $('#trendChart').innerHTML=bars(trend.map(r=>[`${r.year} · ${r.office}`,r.values[field]]),0,1);
    const national=data.rows.find(r=>r.year===year&&r.office==='전체');
    $('#nationalStatistics').textContent=`${year}년 전국 원본 · ${fields.map(f=>`${f} ${fmt(national?.values[f]??null)}명`).join(' · ')}`;
    download('comparisonDownload',[['연도','지방청',...fields],...all.map(r=>[r.year,r.office,...fields.map(f=>r.values[f])])],`triguard-comparison-${year}.csv`);
    download('trendDownload',[['연도','지방청',...fields],...trend.map(r=>[r.year,r.office,...fields.map(f=>r.values[f])])],'triguard-selected-region-history.csv');
  };
  $('#compareField').innerHTML=fields.map(f=>`<option>${esc(f)}</option>`).join('');
  $('#compareField').addEventListener('change',window.renderStatisticsWorkbench);
  $('#agencyExport').addEventListener('click',()=>{const d=agencyData[Number($('#agencyDataset').value)];if(!d)return;const q=$('#agencySearch').value.trim().toLocaleLowerCase('ko-KR');const rows=d.rows.filter(r=>r.some(v=>String(v).toLocaleLowerCase('ko-KR').includes(q)));download('agencyDownload',[d.columns,...rows],'triguard-agency-query.csv');$('#agencyDownload').click();});
  $('#archiveExport').addEventListener('click',()=>{if(!researchScores){$('#archiveStatus').textContent='기존 연구 결과를 먼저 불러와 주세요.';return;}const keys=['지방청','인력Risk','감염병DC','물자Risk','통합Risk','위험등급'];download('archiveDownload',[['생성일','자료 구분',...keys],...researchScores.regions.map(r=>[researchScores.generated_at,'보관 연구 결과 · 재계산 아님',...keys.map(k=>r[k])])],'triguard-archived-research.csv');$('#archiveDownload').click();$('#archiveStatus').textContent='기존 연구 결과 CSV를 준비했습니다. 기준일과 자료 구분이 포함됩니다.';});

  let inspectedSource='';
  window.renderAgencyInspector=()=>{
    const d=agencyData[Number($('#agencyDataset').value)];
    const selector=$('#agencyNumericColumn');
    if(!d){inspectedSource='';selector.disabled=true;selector.innerHTML='';$('#agencyNumericSummary').textContent='기관 자료를 불러온 뒤 확인할 수 있습니다.';$('#agencyNumericChart').innerHTML='';$('#agencyNumericNote').textContent='';return;}
    if(inspectedSource!==d.source){
      inspectedSource=d.source;
      const indices=d.columns.map((_,i)=>i).filter(i=>d.rows.some(r=>StatisticsTools.numeric(r[i])!==null));
      selector.innerHTML=indices.map(i=>`<option value="${i}">${esc(d.columns[i])}</option>`).join('');
      const preferred=indices.find(i=>i>=(d.metadata?.unit?2:1));
      if(preferred!==undefined)selector.value=String(preferred);
      selector.disabled=indices.length===0;
    }
    const query=$('#agencySearch').value.trim().toLocaleLowerCase('ko-KR');
    const rows=d.rows.filter(r=>r.some(v=>String(v).toLocaleLowerCase('ko-KR').includes(query)));
    $('#agencyNumericNote').textContent=(d.note||'')+' '+(d.metadata?.note||'')+' 검색 결과의 처음 20행을 원본 순서로 표시합니다. 전국 합계·소계·서로 다른 집계 항목이 섞일 수 있어 평균이나 합계는 계산하지 않습니다.';
    if(selector.disabled){$('#agencyNumericSummary').textContent='숫자로 해석할 수 있는 열이 없습니다.';$('#agencyNumericChart').innerHTML='';return;}
    const index=Number(selector.value),stats=StatisticsTools.summary(rows,index);
    $('#agencyNumericSummary').textContent=`${d.columns[index]} · 검색 결과 ${rows.length}행 · 수치 ${stats.count}개 · 빈 셀 ${stats.missing}개 · 비수치 ${stats.invalid}개`;
    const display=rows.slice(0,20).map((r,i)=>[d.metadata?.unit?`${r[0]}년 ${r[1]}주`:r[0]||`원본 행 ${i+1}`,r[index]]);
    $('#agencyNumericChart').innerHTML=bars(display,0,1);
  };
  $('#agencyNumericColumn').addEventListener('change',window.renderAgencyInspector);
  window.renderSourceInventory=()=>{
    const sources=data?[{source:data.source,sha256:data.source_sha256,source_rows:data.rows.length,period_note:data.date_note,main:true},...agencyData]:agencyData;
    const rows=sources.map(d=>{
      const matched=validationReport?.status==='passed'&&(d.main?validationReport.source_sha256===d.sha256&&validationReport.row_count===d.source_rows:validationReport.agency_sources?.some(r=>r.source===d.source&&r.sha256===d.sha256&&r.source_rows===d.source_rows));
      return [d.source,d.source_rows,d.period_note||d.metadata?.period||'공통 기준일 미확인',d.metadata?.unit||(d.extra_kind&&d.extra_kind!=='catalog'?'명':'자료별 원문 참조'),matched?'원본 식별정보 일치':'검증 미확인',d.sha256];
    });
    const headers=['자료','원본 자료 행 수','기간 안내','단위 안내','출처 대조','SHA-256'];
    $('#sourceInventory').innerHTML=`<p>${sources.length}/12종 로드</p><table><caption>기관 자료별 연결·기준일·출처 대조</caption><thead><tr>${headers.slice(0,5).map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.slice(0,5).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    download('sourceInventoryDownload',[headers,...rows],'triguard-source-inventory.csv');
  };
  window.renderAgencyInspector();
  window.renderSourceInventory();
  window.renderStatisticsWorkbench();
})();
