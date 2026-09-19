/* Explicit opt-in integration test. Uses only temporary accounts and fixtures.
 * Run with VARDENA_TEST_URL, VARDENA_TEST_KEY and optionally VARDENA_TEST_APP_URL.
 * It signs out all sessions. Cleanup the exact ids in VARDENA_TEST_FIXTURES with
 * an authorized database connection after completion, including after failure.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const ts=require('typescript'),{createClient}=require('@supabase/supabase-js'),{createServerClient}=require('@supabase/ssr');
const root=path.resolve(__dirname,'..'),url=process.env.VARDENA_TEST_URL,key=process.env.VARDENA_TEST_KEY,app=process.env.VARDENA_TEST_APP_URL;
assert.ok(url&&key,'Provide an explicit test project and publishable key');
const fixturePath=process.env.VARDENA_TEST_FIXTURES||'/tmp/vardena-org-fixtures.json';
const record={marker:crypto.randomUUID(),users:[],orgs:[],posts:[]};
const cookies=Array.from({length:4},()=>new Map());
const clients=cookies.map(jar=>createServerClient(url,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:entries=>entries.forEach(({name,value})=>value?jar.set(name,value):jar.delete(name))}}));
const anon=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const save=()=>fs.writeFileSync(fixturePath,JSON.stringify(record));
function compile(file,client){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console,URL,Date,require:name=>{
  if(name==='@/lib/supabase/server')return{createClient:async()=>client};
  if(name==='next/cache')return{revalidatePath:()=>{}};
  if(name==='next/navigation')return{redirect:location=>{throw{location}}};
  if(name.startsWith('@/lib/'))return compile(name.slice(2)+'.ts',client);
  throw Error('Unexpected test import: '+name);
}});return exports;}
const actions=clients.map(client=>compile('app/organization-actions.ts',client));
const form=values=>{const result=new FormData();for(const[k,v]of Object.entries(values))result.set(k,String(v));return result;};
function ok(result,label){assert.equal(result.error,null,label+': '+(result.error?.code||''));return result.data;}
async function redirected(fn){try{await fn();assert.fail('Expected redirect');}catch(e){if(!e.location)throw e;return e.location;}}
async function deniedRead(client,table,filter){const r=await filter(client.from(table).select('*'));assert.ok(r.error||r.data.length===0,table+' leaked data');}
async function pageFor(clientIndex,route){const header=[...cookies[clientIndex]].map(([k,v])=>`${k}=${v}`).join(';');const r=await fetch(app+route,{headers:{cookie:header},redirect:'manual'});return{status:r.status,location:r.headers.get('location'),text:await r.text()};}

(async()=>{
  const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:key}}).then(r=>r.json());assert.equal(settings.mailer_autoconfirm,true,'Disposable signup must not send email');
  for(let i=0;i<clients.length;i++){
    const email=`vardena-org-test-${i}-${record.marker}@example.invalid`;
    const r=await clients[i].auth.signUp({email,password:crypto.randomBytes(30).toString('base64url'),options:{data:{display_name:'Vardena organization test'}}});
    if(r.error)throw Error('signup '+r.error.code);assert.ok(r.data.session);
    record.users.push({id:r.data.user.id,email});save();
  }
  const [owner,admin,member,outsider]=clients,[a,b,c,d]=actions,[uidA,uidB,uidC,uidD]=record.users.map(u=>u.id);
  const fields={name:'Tijdelijke organisatietest',slug:'org-test-'+record.marker.slice(0,8),summary:'Tijdelijke organisatie voor een technische controle.',mission:'Wij testen de toegang van een organisatie met gewone gebruikers.',positions:'Deze testorganisatie heeft geen publieke politieke standpunten.',approach:'Alle testgegevens worden na de technische controle verwijderd.',manifesto:'Tijdelijk testmanifest.'};
  assert.ok((await a.saveOrganization(null,{},form({...fields,mission:'te kort'}))).error);
  await redirected(()=>a.saveOrganization(null,{},form(fields)));
  const org=ok(await owner.from('vardena_organizations').select('id,slug').eq('slug',fields.slug).single(),'org created');record.orgs.push(org);save();
  const own=ok(await owner.from('vardena_org_members').select('role,status').eq('org_id',org.id).eq('user_id',uidA).single(),'owner membership');assert.equal(own.role,'owner');assert.equal(own.status,'active');
  assert.ok((await outsider.from('vardena_organizations').insert({...fields,slug:fields.slug+'-forged',created_by:uidA})).error);
  await redirected(()=>d.saveOrganization(null,{},form({...fields,slug:fields.slug+'-other'})));
  const other=ok(await outsider.from('vardena_organizations').select('id,slug').eq('slug',fields.slug+'-other').single(),'other org');record.orgs.push(other);save();
  assert.ok((await c.saveOrganization(org.id,{},form(fields))).error,'outsider cannot edit org');
  for(const actor of [b,c])assert.ok((await actor.applyToOrganization(org.id,{},form({displayName:actor===b?'Testbeheerder':'Testlid'}))).success);
  await deniedRead(member,'vardena_org_members',q=>q.eq('org_id',org.id).eq('user_id',uidA));
  assert.ok((await c.manageMembership(org.id,uidC,'approve',{},form({}))).error,'no self approval');
  assert.ok((await member.from('vardena_org_members').update({role:'owner',status:'active'}).eq('org_id',org.id).eq('user_id',uidC).select()).data?.length===0,'no direct self promotion');
  assert.ok((await a.manageMembership(org.id,uidB,'approve',{},form({}))).success);
  assert.ok((await a.manageMembership(org.id,uidB,'promote',{},form({}))).success);
  assert.ok((await b.manageMembership(org.id,uidC,'approve',{},form({}))).success);
  assert.ok((await b.manageMembership(org.id,uidC,'promote',{},form({}))).error,'only owner promotes');
  assert.ok((await b.manageMembership(org.id,uidA,'remove',{},form({}))).error,'owner protected');
  const dropOwner=await owner.from('vardena_org_members').delete().eq('org_id',org.id).eq('user_id',uidA).select();assert.equal(dropOwner.data?.length,0);
  const forgeIdentity=await member.from('vardena_org_members').update({user_id:uidD}).eq('org_id',org.id).eq('user_id',uidC);assert.ok(forgeIdentity.error);
  console.log('PASS: required profile fields, atomic owner, pending approval, protected roles and organization isolation');

  const sent=await c.sendGroupMessage(org.id,'Dit is een besloten technisch testbericht.');assert.ok(sent.message,sent.error);
  const read=ok(await admin.from('vardena_org_messages').select('id').eq('id',sent.message.id),'member chat');assert.equal(read.length,1);
  await deniedRead(outsider,'vardena_org_messages',q=>q.eq('org_id',org.id));
  await deniedRead(anon,'vardena_org_messages',q=>q.eq('org_id',org.id));
  assert.ok((await d.sendGroupMessage(org.id,'Geen toegang')).error);
  assert.ok((await member.from('vardena_org_messages').insert({org_id:org.id,sender_id:uidA,body:'Forged author'})).error);
  const assignment={assignee:uidC,title:'Controleer de technische bron',description:'Persoonlijke testopdracht.',kind:'challenge',steps:'Controleer de bron\nLeg de uitkomst vast',dueDate:'2026-10-01'};
  assert.ok((await b.createAssignment(org.id,{},form(assignment))).success);
  const task=ok(await member.from('vardena_org_assignments').select('id,vardena_org_checklist(id,completed)').eq('org_id',org.id).single(),'assigned task');
  assert.equal(task.vardena_org_checklist.length,2);const item=task.vardena_org_checklist[0];
  assert.ok((await c.toggleAssignmentStep(item.id,true)).success);
  assert.equal(ok(await admin.from('vardena_org_checklist').select('completed').eq('id',item.id).single(),'manager progress').completed,true);
  assert.ok((await b.toggleAssignmentStep(item.id,false)).error,'admin cannot fake completion');
  assert.ok((await c.createAssignment(org.id,{},form(assignment))).error,'member cannot assign');
  assert.ok((await b.createAssignment(org.id,{},form({...assignment,assignee:uidD}))).error,'cannot assign outsiders');
  await deniedRead(outsider,'vardena_org_assignments',q=>q.eq('org_id',org.id));
  await deniedRead(outsider,'vardena_org_checklist',q=>q.eq('assignment_id',task.id));
  const before=ok(await admin.from('vardena_org_assignments').select('id').eq('org_id',org.id),'before failed transaction').length;
  const invalid=await admin.rpc('vardena_create_assignment',{p_org:org.id,p_assignee:uidC,p_title:'Rollback test',p_description:'Rollback',p_kind:'task',p_due:null,p_steps:['valid','x'.repeat(201)]});assert.ok(invalid.error);
  assert.equal(ok(await admin.from('vardena_org_assignments').select('id').eq('org_id',org.id),'after failed transaction').length,before,'assignment transaction must roll back');
  console.log('PASS: shared chat, sender identity, private assignments, assignee-only checkboxes and atomic checklists');

  let like=await c.setOrganizationLike(org.id,true);assert.equal(like.likes,1);like=await c.setOrganizationLike(org.id,true);assert.equal(like.likes,1);like=await c.setOrganizationLike(org.id,false);assert.equal(like.likes,0);
  await c.setOrganizationLike(org.id,true);assert.equal(ok(await anon.from('vardena_org_like_stats').select('likes').eq('org_id',org.id).single(),'public org stats').likes,1);
  const postFields={subjectName:'Vardena technische controle',title:'Tijdelijke organisatiepublicatie',body:'Dit bericht controleert organisatiepublicaties en wordt na de test verwijderd.',category:'overig',sourceUrl:'https://vardena.vercel.app/over'};
  assert.ok((await c.createOrganizationPost(org.id,{},form(postFields))).error,'member cannot publish for org');
  const postUrl=await redirected(()=>b.createOrganizationPost(org.id,{},form(postFields)));const postId=postUrl.split('/').at(-1);record.posts.push(postId);save();
  const row=ok(await anon.from('posts').select('organization_id,vardena_organizations(name)').eq('id',postId).single(),'org attribution');assert.equal(row.organization_id,org.id);
  ok(await member.from('vardena_reactions').insert({post_id:postId,user_id:uidC,value:1}),'post like');
  const rank=ok(await anon.from('vardena_popular_posts').select('score,likes,dislikes').eq('id',postId).single(),'public popularity');assert.equal(rank.score,1);
  assert.equal(ok(await anon.from('vardena_org_post_stats').select('likes,posts').eq('organization_id',org.id).single(),'org publication stats').likes,1);
  const postLib=compile('lib/posts.ts',anon);const timeline=await postLib.readTimeline(anon,1,true);assert.equal(timeline.error,null);assert.ok(timeline.data.some(p=>p.id===postId));
  console.log('PASS: organization likes are idempotent, authorized publication, public attribution and popularity data');

  if(app){
    for(const tab of ['overzicht','leden','aanmeldingen','opdrachten','publiceren','instellingen','chat']){
      const response=await pageFor(0,`/organisaties/${org.slug}/groep?tab=${tab}`);assert.equal(response.status,200,tab);assert.ok(!response.text.includes('Er ging iets mis'),tab+' crashed');assert.ok(response.text.includes(fields.name),tab+' missing org');
    }
    const myTasks=await pageFor(2,`/organisaties/${org.slug}/groep?tab=opdrachten`);assert.ok(myTasks.text.includes('Controleer de technische bron'));
    const forbidden=await pageFor(3,`/organisaties/${org.slug}/groep`);assert.ok([303,307].includes(forbidden.status));
    const privateApi=await fetch(app+`/api/organisaties/${org.id}/chat`,{headers:{cookie:[...cookies[2]].map(([k,v])=>`${k}=${v}`).join(';')}});assert.equal(privateApi.status,200);assert.ok(privateApi.headers.get('cache-control').includes('no-store'));assert.equal((await privateApi.json()).messages.length,1);
    const outsiderApi=await fetch(app+`/api/organisaties/${org.id}/chat`,{headers:{cookie:[...cookies[3]].map(([k,v])=>`${k}=${v}`).join(';')}});assert.equal(outsiderApi.status,403);
    console.log('PASS: all authenticated group pages render, member assignment page and chat API enforce access');
  }
  assert.ok((await b.manageMembership(org.id,uidC,'remove',{},form({}))).success);
  await deniedRead(member,'vardena_org_messages',q=>q.eq('org_id',org.id));
  await deniedRead(member,'vardena_org_assignments',q=>q.eq('org_id',org.id));
  assert.ok((await c.toggleAssignmentStep(item.id,false)).error,'removed member cannot complete');
  assert.ok((await c.sendGroupMessage(org.id,'After removal')).error);
  assert.ok((await a.manageMembership(org.id,uidB,'demote',{},form({}))).success);
  assert.ok((await b.createOrganizationPost(org.id,{},form(postFields))).error,'demoted admin cannot publish');
  assert.ok((await b.createAssignment(org.id,{},form({...assignment,assignee:uidA}))).error,'demoted admin cannot assign');
  await deniedRead(admin,'vardena_org_assignments',q=>q.eq('org_id',org.id));
  console.log('PASS: removal and demotion immediately revoke access and privileged operations');
  console.log('ORGANIZATION_TESTS_PASSED; clean up only the recorded fixtures after this process exits.');
})().catch(error=>{console.error('FAIL:',error.message);process.exitCode=1;}).finally(async()=>{await Promise.all(clients.map(client=>client.auth.signOut()));save();});
