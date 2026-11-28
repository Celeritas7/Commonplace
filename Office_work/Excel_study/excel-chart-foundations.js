/* F5C: pin the F5B version-1 source register; chart history is session-only. */
(function(global){
  'use strict';
  const C=global.CommonplaceExcelCurriculum,P=global.CommonplaceExcelPivotFoundations;
  const runtime=Object.freeze({id:'personal-charts',version:1}),rubric=Object.freeze({id:'chart-foundations',version:1});
  const ids=['chart-group-amounts','chart-status-counts','chart-ready-report'];
  function exercise(lessonId,scenarioId,version,mode){
    if(!ids.includes(lessonId))throw Error('Choose an exact chart lesson.');
    const ex=P.exercise('pivot-group-total',scenarioId,version,mode);
    if(ex.lesson.id!=='pivot-group-total'||ex.lesson.version!==1||ex.lesson.runtime.id!=='personal-pivots'||
       ex.lesson.runtime.version!==1||ex.dataset.version!==1||ex.dataset.id!=='f5b-pivot-group-total-'+scenarioId+'-'+mode)
      throw Error('Unsupported chart source version.');
    return {...ex,lesson:C.resolveLesson({id:lessonId,version:1}),dataset:{id:'f5c-'+lessonId+'-'+scenarioId+'-'+mode,version:1}};
  }
  global.CommonplaceExcelChartFoundations=Object.freeze({
    list:()=>C.listLessons(runtime),exercise,
    config:value=>C.validateChartConfig(runtime,value),
    capture:cells=>C.captureChartSource(runtime,cells),
    view:(config,cells)=>C.chartView(runtime,config,cells),
    grade:(ex,config,snapshot,current,insight)=>C.gradeChart(rubric,ex,config,snapshot,current,insight)
  });
})(window);
