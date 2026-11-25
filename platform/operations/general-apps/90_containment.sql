-- REVIEW CANDIDATE: stop rollout without deleting accounts, study work or maps.
-- Requires 01, 03 and 04. Do not undo security fixes by restoring broad policies.
begin;
update cp_private.signup_control set enabled=false where id=true;
update ga_private.edge_grants set revoked=true where revoked=false;
revoke execute on function public.roadmap_start_session(uuid,text,text) from public,anon,authenticated,service_role;
commit;
-- Existing CP membership is separate: use cp_set_learner for targeted access
-- revocation. This does not recall exported files or disconnected copies.
