'use strict';
const QualityLog = (() => {
  const types = Object.freeze({'CHECK-01':'원본 식별','CHECK-02':'표시 수치','CHECK-03':'중복','CHECK-04':'숫자 형식','CHECK-05':'관할 누락','CHECK-06':'전국 합계','CHECK-07':'다운로드','UI-01':'화면·지도·조작'});
  function text(value, limit) {
    if(typeof value!=='string' || !value.trim() || value.trim().length>limit) throw Error('필수 내용을 길이 제한 안에서 입력하세요.');
    return value.trim();
  }
  function stamp(value) {
    if(!Number.isFinite(Date.parse(value))) throw Error('기록 시각을 확인할 수 없습니다.');
    return value;
  }
  function revision(value) {
    if(!/^[a-f0-9]{40}$/.test(value||'')) throw Error('자료 버전을 확인할 수 없습니다. 화면을 다시 불러오세요.');
    return value;
  }
  function create(input, context, id, time) {
    if(!Object.hasOwn(types,input.requirement)) throw Error('확인 항목을 선택하세요.');
    return {id,requirement:input.requirement,expected:text(input.expected,500),observed:text(input.observed,500),
      context:{region:text(context.region,80),examYear:text(context.examYear,4),revision:revision(context.revision)},
      status:'open',history:[{action:'registered',note:'사용자 등록 · 자동 검증 결과 아님',at:stamp(time),revision:context.revision}]};
  }
  function transition(record, action, note, version, time) {
    const allowed={open:{fixed:'fixed'},fixed:{pass:'closed',fail:'open'},closed:{reopen:'open'}};
    const status=allowed[record.status]?.[action];
    if(!status) throw Error('현재 상태에서는 이 작업을 수행할 수 없습니다.');
    if(record.history.length>=50) throw Error('기록별 이력은 50개까지 지원합니다. JSON으로 보관하세요.');
    return {...record,status,history:[...record.history,{action,note:text(note,1000),at:stamp(time),revision:revision(version)}]};
  }
  return {types,create,transition};
})();
if(typeof module!=='undefined' && module.exports) module.exports=QualityLog;
