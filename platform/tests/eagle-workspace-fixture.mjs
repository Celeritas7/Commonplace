import { readFile } from 'node:fs/promises';
export const eagleFixture=await readFile(new URL('./eagle-workspace-fixture.sql',import.meta.url),'utf8');
export const eagleCandidate=await readFile(new URL('../operations/general-apps/07_eagle_workspace.sql',import.meta.url),'utf8');
export const eagleId=n=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const eagleTables=['logi_projects','logi_assemblies','logi_versions','logi_nodes','logi_links','logi_revisions','eagle_units','eagle_unit_progress'];
export const eagleSeed=`
 insert into logi_projects(id,name) values('${eagleId(1)}','Synthetic project'),('${eagleId(2)}','Unlinked project');
 insert into logi_assemblies(id,name,project_id) values
  ('${eagleId(3)}','Assembly A','${eagleId(1)}'),('${eagleId(4)}','Assembly B','${eagleId(1)}'),('${eagleId(5)}','Unlinked assembly','${eagleId(2)}');
 insert into logi_versions(id,assembly_id,version) values
  ('${eagleId(6)}','${eagleId(3)}','A'),('${eagleId(7)}','${eagleId(4)}','B'),('${eagleId(8)}','${eagleId(3)}','A2');
 update logi_assemblies set current_version_id='${eagleId(6)}' where id='${eagleId(3)}';
 insert into logi_nodes(id,name,assembly_id,version_id) values
  ('${eagleId(9)}','Node A','${eagleId(3)}','${eagleId(6)}'),('${eagleId(10)}','Node B','${eagleId(4)}','${eagleId(7)}'),
  ('${eagleId(11)}','Node without version','${eagleId(3)}',null),('${eagleId(12)}','Node A2','${eagleId(3)}','${eagleId(8)}');
 insert into logi_links(id,assembly_id,child_id,parent_id) values('${eagleId(13)}','${eagleId(3)}','${eagleId(9)}','${eagleId(11)}');
 insert into logi_revisions(id,assembly_id,label,snapshot) values('${eagleId(14)}','${eagleId(3)}','Retain snapshot','{"synthetic":"preserve"}');
 insert into eagle_units(id,assembly_id,version_id,name,notes) values
  ('${eagleId(15)}','${eagleId(3)}','${eagleId(6)}','Unit A','Retain unit 日本語'),('${eagleId(16)}','${eagleId(4)}',null,'Unit B','Optional version');
 insert into eagle_unit_progress(id,unit_id,node_id,status,actual_min,override_estimate,completed_at,completed_by,notes)
 values('${eagleId(17)}','${eagleId(15)}','${eagleId(9)}','done',42,60,'2026-01-01','Synthetic writer','Retain progress 日本語');
`;
