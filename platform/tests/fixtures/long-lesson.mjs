import {exampleBundle} from '../../content/examples.mjs';
// All identity components at the accepted contract limits; no real learner data.
export function longLesson() {
  const bundle=exampleBundle('trade');
  for(const kind of ['concept','scenario','dataset','lesson']) {
    bundle[kind].id=kind+'.'+'x'.repeat(99-kind.length);
    bundle[kind].version=Number.MAX_SAFE_INTEGER;
  }
  for(const kind of ['concept','scenario','dataset'])bundle.lesson[kind+'_ref']={id:bundle[kind].id,version:bundle[kind].version};
  bundle.lesson.activities[0].id='a'.repeat(100);
  const assignment={schema_version:1,kind:'assignment',id:'assignment.'+'x'.repeat(89),version:Number.MAX_SAFE_INTEGER,section_id:'office.excel',lesson_ref:{id:bundle.lesson.id,version:bundle.lesson.version},status:'assigned'};
  return {bundle,assignment,activityId:bundle.lesson.activities[0].id};
}
