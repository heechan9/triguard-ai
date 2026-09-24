'use strict';
(() => {
  const form=document.getElementById('qualityForm');
  if(!form) return;
  let records=[],downloadURL=null;
  const byId=(id)=>document.getElementById(id);
  const statuses={open:'확인 필요',fixed:'수정 기록 · 재시험 대기',closed:'사용자 재시험 통과'};
  const actions={open:[['fixed','수정 내용 기록']],fixed:[['pass','재시험 통과 기록'],['fail','재시험 실패 · 다시 확인']],closed:[['reopen','문제 재등록']]};
  const actionNames={registered:'등록',fixed:'수정 기록',pass:'재시험 통과',fail:'재시험 실패',reopen:'다시 확인'};
  const message=(value)=>{byId('qualityMessage').textContent=value;};
  const version=()=>typeof ReleaseVersion!=='undefined'?ReleaseVersion.revision:'';
  function el(tag,text) {const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
  for(const [value,label] of Object.entries(QualityLog.types)){
    const option=el('option',value+' · '+label);option.value=value;byId('qualityRequirement').append(option);
  }
  function render() {
    const list=byId('qualityRecords');list.replaceChildren();
    message(records.length ? records.length+'개 사용자 기록 · 확인 필요 '+records.filter(r=>r.status==='open').length+'개 · 재시험 대기 '+records.filter(r=>r.status==='fixed').length+'개 · 사용자 통과 '+records.filter(r=>r.status==='closed').length+'개' : '등록된 사용자 기록이 없습니다.');
    for(const record of records) {
      const card=el('article');card.className='quality-record';
      card.append(el('h4',record.id+' · '+QualityLog.types[record.requirement]+' · '+statuses[record.status]));
      card.append(el('p',record.context.region+' · 병역판정검사 '+record.context.examYear+'년 · 등록 시점의 선택값'));
      const rev=el('p','등록 자료 버전: '+record.context.revision);rev.className='source-hash';card.append(rev);
      card.append(el('p','기대 결과: '+record.expected),el('p','관찰 결과: '+record.observed));
      const history=el('details');history.append(el('summary','처리 이력 '+record.history.length+'건'));
      const ul=el('ul');
      record.history.forEach(h=>{const li=el('li',actionNames[h.action]+' · '+new Date(h.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' (한국시간) · '+h.note+' · 버전 '+h.revision);li.className='source-hash';ul.append(li);});
      history.append(ul);card.append(history);
      const update=el('form');update.className='quality-form';
      const label=el('label','처리 내용·재시험 근거 ('+record.id+')');
      const note=el('textarea');note.required=true;note.maxLength=1000;note.rows=2;label.append(note);update.append(label);
      const actionLabel=el('label','처리 단계 ('+record.id+')'),select=el('select');
      actions[record.status].forEach(([v,title])=>{const o=el('option',title);o.value=v;select.append(o);});
      actionLabel.append(select);update.append(actionLabel);
      const button=el('button','기록 저장 ('+record.id+')');button.type='submit';update.append(button);
      update.addEventListener('submit',event=>{
        event.preventDefault();
        try{
          const next=QualityLog.transition(record,select.value,note.value,version(),new Date().toISOString());
          records=records.map(r=>r.id===record.id?next:r);render();
          byId('qualityMessage').focus();
        }catch(error){message(error.message);}
      });card.append(update);list.append(card);
    }
    if(downloadURL) URL.revokeObjectURL(downloadURL);
    const link=byId('qualityDownload');link.hidden=!records.length;
    if(records.length) {
      downloadURL=URL.createObjectURL(new Blob([JSON.stringify({schema_version:1,scope:'사용자 수기 검토 기록 · 자동 검증/인증 아님',exported_at:new Date().toISOString(),records},null,2)],{type:'application/json'}));
      link.href=downloadURL;
    } else {downloadURL=null;link.removeAttribute('href');}
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    try{
      if(records.length>=100) throw Error('한 세션에 100개까지 기록할 수 있습니다.');
      const record=QualityLog.create({requirement:byId('qualityRequirement').value,expected:byId('qualityExpected').value,observed:byId('qualityObserved').value},
        {region:byId('province').value,examYear:byId('year').value,revision:version()},'QA-'+String(records.length+1).padStart(3,'0'),new Date().toISOString());
      records.push(record);form.reset();render();
    }catch(error){message(error.message);}
  });
  render();
})();
