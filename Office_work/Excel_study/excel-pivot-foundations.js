/* F5B: reuse the reviewed F5A v1 register, with distinct pivot dataset identities. */
(function(global){
  'use strict';
  const curriculum=global.CommonplaceExcelCurriculum,summary=global.CommonplaceExcelSummaryFoundations;
  const runtime=Object.freeze({id:'personal-pivots',version:1}),rubric=Object.freeze({id:'pivot-foundations',version:1});
  const ids=['pivot-group-total','pivot-status-count','pivot-filtered-total'];
  function exercise(lessonId,scenarioId,version,mode){
    if(!ids.includes(lessonId)||!['guided','independent'].includes(mode))throw Error('Choose an exact pivot lesson and mode.');
    const source=summary.exercise('sumif-status',scenarioId,version,mode);
    if(source.lesson.id!=='sumif-status'||source.lesson.version!==1||source.dataset.version!==1||
        source.dataset.id!=='f5a-sumif-status-'+scenarioId+'-'+mode||
        source.lesson.runtime.id!=='personal-conditional-summaries'||source.lesson.runtime.version!==1)
      throw Error('Unsupported pivot source version.');
    const values=Object.fromEntries(Object.entries(source.values).filter(([address])=>/^[ABCD][2-7]$/.test(address)));
    return {lesson:curriculum.resolveLesson({id:lessonId,version:1}),scenario:source.scenario,mode,
      values,unit:source.unit,heading:source.heading,groupHeading:source.groupHeading,context:source.context,
      dataset:{id:'f5b-'+lessonId+'-'+scenarioId+'-'+mode,version:1}};
  }
  global.CommonplaceExcelPivotFoundations=Object.freeze({
    list:()=>curriculum.listLessons(runtime),exercise,
    layout:config=>curriculum.validatePivotLayout(runtime,config),
    capture:cells=>curriculum.capturePivotSource(runtime,cells),
    view:(config,snapshot)=>curriculum.pivotView(runtime,config,snapshot),
    grade:(ex,config,snapshot,current)=>curriculum.gradePivot(rubric,ex,config,snapshot,current),
  });
})(window);
