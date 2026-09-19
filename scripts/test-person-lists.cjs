/* Opt-in real API + ordinary user + rendered-page integration checks.
 * Temporary content is removed and sessions revoked; printed auth ID needs admin cleanup.
 */
const assert = require('node:assert/strict'), crypto = require('node:crypto'), fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const root=path.resolve(__dirname,'..');
if(process.env.ALLOW_LIVE_TESTS!=='1')throw new Error('Set ALLOW_LIVE_TESTS=1 explicitly.');
assert.ok(fs.existsSync(path.join(root,'.next/BUILD_ID')),'Finish production build first.');
const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {parsePastedTable,parsePersonList,safeWikipediaUrl}=require('../lib/person-lists.ts');
const {searchWikipediaPeople,resolveWikipediaPeople}=require('../lib/wikipedia.ts');
const {publishPost}=require('../lib/publish-post.ts');
const {readTimeline,readFeedStatus,enrichPosts}=require('../lib/posts.ts');
const {feedFingerprint}=require('../lib/feed-types.ts');
const {createServerClient}=require('@supabase/ssr'),{createClient}=require('@supabase/supabase-js');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url&&key);
const jar=new Map(), client=createServerClient(url,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>value?jar.set(name,value):jar.delete(name))}});
const anon=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const marker=crypto.randomUUID(),posts=[];let user,application,server;
function request(route,signedIn=false){return new Promise((resolve,reject)=>{const req=http.get({hostname:'127.0.0.1',port:3106,path:route,headers:signedIn?{cookie:[...jar].map(([k,v])=>`${k}=${v}`).join(';')}:{}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body,headers:res.headers}));});req.setTimeout(90000,()=>req.destroy(new Error('Page timeout')));req.on('error',reject);});}
function form(entries,extra={}){const f=new FormData();for(const[k,v]of Object.entries({kind:'list',title:'[Tijdelijke technische test] Personenlijst '+marker.replaceAll('-',''),body:'Deze lijst is uitsluitend een tijdelijke functionele controle. Geen inhoudelijke claims.',subjectName:'Technische test',category:'overig',peopleList:JSON.stringify(entries),...extra}))f.set(k,v);return f;}
(async()=>{
  const imported=parsePastedTable('| PersoonDossierWat bleef buiten beeld?Sterkte bewijs | | | |\n| ---- | ---- | ---- | ---- |\n| **Mark Rutte** | Teevendeal | Geleverde voorbeeldtekst | Inschatting van auteur |\n| **Halbe Zijlstra / Stef Blok** | Syrië | Voorbeeldtekst | Onzeker |');
  assert.equal(imported.length,3);assert.equal(imported[0].query,'Mark Rutte');assert.equal(imported[1].query,'Halbe Zijlstra');assert.equal(imported[2].query,'Stef Blok');
  assert.equal(parsePastedTable('Persoon\tDossier\tToelichting\tBewijs\n@Mark Rutte\tDossier\tContext\tOnzeker')[0].query,'Mark Rutte');
  assert.throws(()=>parsePastedTable('Niet een tabel'));assert.throws(()=>parsePersonList('[]'));
  for(const link of ['javascript:alert(1)','https://nl.wikipedia.org.evil.test/wiki/Test','https://evil@nl.wikipedia.org/wiki/Test','https://nl.wikipedia.org:444/wiki/Test'])assert.equal(safeWikipediaUrl(link),false);
  console.log('PASS supplied table shape, spreadsheet import, split names, unsafe links and empty-list validation');
  const people=[];
  for(const name of ['Mark Rutte','Ard van der Steur','Ivo Opstelten','Fred Teeven']){const found=await searchWikipediaPeople('@'+name);const person=found.find(p=>p.name.toLowerCase()===name.toLowerCase());assert.ok(person,'Wikipedia person '+name);people.push(person);}
  assert.equal((await resolveWikipediaPeople(['Q64'])).length,0,'Berlin is not a person');
  console.log('PASS real Wikipedia matches for four supplied names; non-person excluded');
  const signup=await client.auth.signUp({email:`vardena-list-test-${marker}@example.invalid`,password:crypto.randomBytes(30).toString('base64url'),options:{data:{display_name:'Tijdelijke lijsttest'}}});
  assert.equal(signup.error,null);assert.ok(signup.data.session);user=signup.data.user.id;console.log('FIXTURE_USER',user);
  assert.equal((await client.from('vardena_members').insert({id:user,username:'lijsttest_'+marker.slice(0,8),display_name:'Tijdelijke lijsttest',bio:''})).error,null);
  const entries=people.map(p=>({wikidataId:p.wikidataId,name:p.name,wikipediaUrl:p.wikipediaUrl,dossier:'Technische test',context:'Uitsluitend een tijdelijke controle van de lijstweergave. Geen feitelijke claim.',evidence:'Testtekst, geen inhoudelijke bewijsbeoordeling.',sourceUrl:'https://www.mediawiki.org/wiki/Wikibase/API'}));
  assert.throws(()=>parsePersonList(JSON.stringify([...entries,entries[0]])));
  const invalid=await publishPost(client,user,form([{...entries[0],wikidataId:'Q64'}]));assert.ok(invalid.error);
  const result=await publishPost(client,user,form(entries.map((e,i)=>i===0?{...e,name:'Verkeerde naam',wikipediaUrl:'https://nl.wikipedia.org/wiki/Verkeerd'}:e)));
  assert.equal(result.error,undefined);posts.push(result.id);console.log('FIXTURE_POST',result.id);
  const actual=await anon.from('posts').select('id,people_list').eq('id',result.id).single();assert.equal(actual.error,null);assert.deepEqual(actual.data.people_list,entries);
  const before=(await client.from('posts').select('id',{count:'exact',head:true}).eq('author_id',user)).count;
  const forbidden=await Promise.all([
    client.from('posts').update({people_list:[]}).eq('id',result.id),
    client.from('posts').insert({author_id:user,kind:'list',title:'[Test] Ongeldige lijst',body:'Een ongeldige lijst moet volledig geweigerd worden.',subject_name:'Test',category:'overig',people_list:[{...entries[0],wikipediaUrl:'javascript:alert(1)'}]}),
    client.from('posts').insert({author_id:user,kind:'announcement',title:'[Test] Ongeldig type',body:'Een gewone mededeling mag geen lijst bevatten.',subject_name:'Test',category:'overig',people_list:entries}),
    anon.from('posts').insert({author_id:user,kind:'list',title:'[Test] Ongeldige auteur',body:'Een bezoeker mag geen lijst kunnen publiceren.',subject_name:'Test',category:'overig',people_list:entries}),
  ]);forbidden.forEach(r=>assert.ok(r.error));assert.equal((await client.from('posts').select('id',{count:'exact',head:true}).eq('author_id',user)).count,before);
  console.log('PASS atomic publication, canonical Wikipedia identity, database shape validation and permissions');
  const timeline=await readTimeline(anon,1,false,'list','overig','Teeven');assert.equal(timeline.error,null);assert.ok(timeline.data.some(p=>p.id===result.id));
  const rich=await enrichPosts(client,timeline.data,user),status=await readFeedStatus(anon,1,false,'list','overig','Teeven');assert.equal(feedFingerprint(rich,timeline.count),feedFingerprint(status.data,status.count));
  const legacy=await publishPost(client,user,form([],{kind:'announcement'}));assert.equal(legacy.error,undefined);posts.push(legacy.id);
  console.log('PASS list-name search, filters, live fingerprint and normal post compatibility');
  application=require('next')({dev:false,dir:root,hostname:'127.0.0.1',port:3106});await application.prepare();server=http.createServer(application.getRequestHandler());await new Promise(r=>server.listen(3106,'127.0.0.1',r));
  const pages=await Promise.all([request('/feed?type=list&q='+marker.replaceAll('-','')),request(`/bericht/${result.id}`),request('/feed?schrijven=lijst',true),request('/api/people/search?q=%40Mark%20Rutte'),request('/api/people/search?q=x')]);
  for(const i of[0,1,2,3])assert.equal(pages[i].status,200);assert.equal(pages[4].status,400);
  assert.equal((pages[0].body.match(/class="person-list-row"/g)||[]).length,3);
  assert.equal((pages[1].body.match(/class="person-list-row"/g)||[]).length,4);
  assert.ok(pages[0].body.includes('Bekijk alle 4 personen (+1)'));assert.ok(pages[1].body.includes('Fred Teeven op Wikipedia'));
  assert.ok(pages[2].body.includes('Samenvatting'));assert.ok(pages[2].body.includes('Personenlijst samenstellen'));assert.ok(pages[2].body.includes('combobox'));
  assert.equal(JSON.parse(pages[3].body).people[0].name,'Mark Rutte');assert.ok(pages[3].headers['cache-control'].includes('public'));
  console.log('PERSON_LIST_TESTS_PASSED');
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;}).finally(async()=>{
  if(posts.length && process.env.KEEP_LIST_FIXTURE_FOR_BROWSER!=='1'){const r=await client.from('posts').delete().in('id',posts);if(r.error)console.error('POST_CLEANUP_FAILED',r.error.code);}
  await client.auth.signOut();console.log('REVOKED_SESSION_CLEANUP',JSON.stringify({user,posts}));
  if(server)await new Promise(r=>server.close(r));if(application)await application.close();
});
