/* Explicitly opt in. Temporary fixtures are removed, sessions revoked, and exact
 * auth IDs printed for final admin cleanup. No service credentials are used. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
if (process.env.ALLOW_LIVE_TESTS !== '1') throw new Error('Set ALLOW_LIVE_TESTS=1 explicitly.');
assert.ok(fs.existsSync(path.join(root, '.next/BUILD_ID')), 'Finish the production build first.');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { readTimeline, readFeedStatus, enrichPosts } = require('../lib/posts.ts');
const { feedFingerprint, feedHref, feedSearch } = require('../lib/feed-types.ts');
const { createServerClient } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key);
const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const fixtures = [], marker = crypto.randomUUID().replaceAll('-', '');
let postId, application, server;
function session() {
  const jar = new Map();
  const client = createServerClient(url, key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: items => items.forEach(({name,value}) => value ? jar.set(name,value) : jar.delete(name)) } });
  return { jar, client, id: null };
}
function request(route, fixture, action, args) {
  const headers = { origin: 'http://127.0.0.1:3106' };
  if (fixture) headers.cookie = [...fixture.jar].map(([k,v]) => `${k}=${v}`).join(';');
  if (action) { headers['next-action'] = action; headers['content-type'] = 'text/plain;charset=UTF-8'; headers.accept = 'text/x-component'; }
  return new Promise((resolve,reject) => {
    const req = http.request({ hostname:'127.0.0.1',port:3106,path:route,method:action?'POST':'GET',headers }, res => {
      let body=''; res.on('data',c=>body+=c); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
    });
    req.setTimeout(90000,()=>req.destroy(new Error('HTTP timeout'))); req.on('error',reject);
    req.end(action ? JSON.stringify(args) : undefined);
  });
}
async function action(name,args,fixture) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root,'.next/server/server-reference-manifest.json'),'utf8'));
  const found = Object.entries(manifest.node).find(([,v])=>v.filename==='app/discovery-actions.ts'&&v.exportedName===name);
  assert.ok(found, name);
  const response = await request(`/bericht/${postId}`, fixture, found[0], args);
  assert.equal(response.status,200, `${name}: HTTP ${response.status}`);
  const line = response.body.match(/^1:(\{.*\})$/m);
  assert.ok(line, `${name}: action result missing`);
  return JSON.parse(line[1]);
}
(async () => {
  assert.equal(feedSearch('  bron  '),'bron'); assert.equal(feedSearch('x'.repeat(130)).length,100);
  assert.equal(feedHref('post',false,'media',2,'open bron'),'/feed?type=post&sort=nieuw&onderwerp=media&pagina=2&q=open+bron');
  for(let i=0;i<2;i++) {
    const fixture=session(); fixtures.push(fixture);
    const r=await fixture.client.auth.signUp({email:`vardena-discovery-${marker}-${i}@example.invalid`,password:crypto.randomBytes(30).toString('base64url'),options:{data:{display_name:'Tijdelijke functionaliteitstest'}}});
    assert.equal(r.error,null); assert.ok(r.data.session); fixture.id=r.data.user.id; console.log('FIXTURE_USER',fixture.id);
    assert.equal((await fixture.client.from('vardena_members').insert({id:fixture.id,username:`discovery_${marker.slice(0,8)}_${i}`,display_name:'Tijdelijke functionaliteitstest',bio:''})).error,null);
  }
  const [a,b]=fixtures;
  const p=await a.client.from('posts').insert({author_id:a.id,title:`[Tijdelijke technische test] ${marker}`,subject_name:'Technische controle',body:'Uitsluitend tijdelijke testgegevens voor zoeken, bewaren en reacties.',category:'overig',kind:'announcement'}).select('id').single();
  assert.equal(p.error,null);postId=p.data.id;console.log('FIXTURE_POST',postId);
  const found=await readTimeline(anon,1,false,'announcement','overig',marker);
  assert.equal(found.error,null);assert.equal(found.count,1);assert.equal(found.data[0].id,postId);
  const excluded=await readTimeline(anon,1,true,'photo','overig',marker);assert.equal(excluded.count,0);
  const punctuation=await readTimeline(anon,1,false,'all','',"'); select * from auth.users; --");assert.equal(punctuation.error,null);
  console.log('PASS full-text search, combined filters, safe punctuation');
  application=require('next')({dev:false,dir:root,hostname:'127.0.0.1',port:3106});await application.prepare();
  server=http.createServer(application.getRequestHandler());await new Promise(resolve=>server.listen(3106,'127.0.0.1',resolve));
  const guest=await action('setBookmark',[postId,true]);assert.ok(guest.error);
  assert.equal((await action('setBookmark',[postId,true],a)).error,undefined);
  assert.equal((await action('setBookmark',[postId,true],a)).error,undefined);
  const [own,other,publicSaved,spoof,backdate]=await Promise.all([
    a.client.from('vardena_bookmarks').select('post_id').eq('post_id',postId),
    b.client.from('vardena_bookmarks').select('post_id').eq('post_id',postId),
    anon.from('vardena_bookmarks').select('post_id'),
    b.client.from('vardena_bookmarks').insert({user_id:a.id,post_id:postId}),
    b.client.from('vardena_bookmarks').insert({user_id:b.id,post_id:postId,created_at:'2020-01-01'}),
  ]);
  assert.equal(own.error,null);assert.equal(own.data.length,1);assert.equal(other.data.length,0);assert.ok(publicSaved.error);assert.ok(spoof.error);assert.ok(backdate.error);
  console.log('PASS authenticated bookmark action, retry, owner-only visibility, no spoofing/backdating');
  const commentId=crypto.randomUUID(),body='[Tijdelijke technische test] Een echte reactie via de serveractie. <script>test</script>';
  assert.ok((await action('addComment',[postId,commentId,body])).error);
  assert.ok((await action('addComment',[postId,crypto.randomUUID(),'x'],a)).error);
  assert.equal((await action('addComment',[postId,commentId,body],a)).error,undefined);
  assert.equal((await action('addComment',[postId,commentId,body],a)).error,undefined);
  const [comments,forged,changed,dated]=await Promise.all([
    anon.from('vardena_comments').select('id,body',{count:'exact'}).eq('post_id',postId),
    b.client.from('vardena_comments').insert({post_id:postId,author_id:a.id,body:'Niet toegestaan'}),
    b.client.from('vardena_comments').update({body:'Niet toegestaan'}).eq('id',commentId),
    a.client.from('vardena_comments').insert({post_id:postId,author_id:a.id,body:'Niet toegestaan',created_at:'2020-01-01'}),
  ]);
  assert.equal(comments.error,null);assert.equal(comments.count,1);assert.ok(forged.error);assert.ok(changed.error);assert.ok(dated.error);
  await action('deleteComment',[postId,commentId],b);
  assert.equal((await anon.from('vardena_comments').select('id').eq('id',commentId)).data.length,1);
  const rich=await enrichPosts(a.client,found.data,a.id),status=await readFeedStatus(anon,1,false,'announcement','overig',marker);
  assert.equal(rich[0].bookmarked,true);assert.equal(rich[0].comments,1);assert.equal(feedFingerprint(rich,found.count),feedFingerprint(status.data,status.count));
  console.log('PASS comment action, retry, validation, public count, author-only deletion, live fingerprint');
  const pages=await Promise.all([
    request('/feed?q='+marker),request('/opgeslagen',a),request('/opgeslagen',b),request('/opgeslagen'),request(`/bericht/${postId}`,a),request(`/bericht/${postId}`),request('/api/feed/status?type=announcement&sort=nieuw&onderwerp=overig&q='+marker),
  ]);
  for(const i of [0,1,2,4,5,6]){assert.equal(pages[i].status,200);assert.ok(!pages[i].body.includes('Er ging iets mis'));}
  assert.ok(pages[0].body.includes('Resultaten voor'));assert.ok(pages[0].body.includes(marker));
  assert.ok(pages[1].body.includes(marker));assert.ok(!pages[2].body.includes(marker));assert.equal(pages[3].status,307);assert.ok(pages[3].headers.location.includes('/login'));
  assert.ok(pages[4].body.includes('Plaats reactie'));assert.ok(pages[4].body.includes('&lt;script&gt;test&lt;/script&gt;'));assert.ok(pages[5].body.includes('om mee te praten'));
  assert.equal(JSON.parse(pages[6].body).fingerprint,feedFingerprint(status.data,status.count));assert.ok(pages[6].headers['cache-control'].includes('no-store'));
  console.log('PASS rendered search, private saved pages, login redirect, comments and escaped HTML');
  assert.equal((await action('deleteComment',[postId,commentId],a)).error,undefined);
  assert.equal((await action('setBookmark',[postId,false],a)).error,undefined);
  const after=await enrichPosts(a.client,found.data,a.id);assert.equal(after[0].comments,0);assert.equal(after[0].bookmarked,false);
  console.log('DISCOVERY_TESTS_PASSED');
})().catch(error=>{console.error('FAIL',error.stack);process.exitCode=1;}).finally(async()=>{
  if(postId){const r=await fixtures[0].client.from('posts').delete().eq('id',postId);if(r.error)console.error('POST_CLEANUP_FAILED',r.error.code);}
  await Promise.all(fixtures.map(async f=>{await f.client.auth.signOut();}));
  console.log('REVOKED_SESSION_CLEANUP',JSON.stringify(fixtures.map(f=>f.id)));
  if(server)await new Promise(resolve=>server.close(resolve));if(application)await application.close();
});
