// Activation requires U1 staging, backup and origin approval. Never read project
// settings or keys from query strings/localStorage. Never put a secret key here.
export const deployment = null;

// Resolve the reviewed client relative to this shared deployment module, so
// Admin Studio and the learner host use precisely the same client/session.
export async function loadDeploymentClient(){
 if(!deployment)return null;
 if(typeof deployment.clientModule!=="string"||!deployment.clientModule)throw Error("Reviewed client module required");
 const {client}=await import(new URL(deployment.clientModule,import.meta.url).href);
 if(!client)throw Error("Shared client unavailable");
 return client;
}
