/* Opt-in integration test: temporary accounts/content on the configured project.
 * Uses ordinary user/anon clients, never service credentials. Prints exact account
 * and organization IDs for admin cleanup after revoking its own session.
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
if (process.env.ALLOW_LIVE_TESTS !== '1') throw new Error('Set ALLOW_LIVE_TESTS=1 explicitly.');
if (!fs.existsSync(path.join(root,'.next','BUILD_ID'))) throw new Error('Finish the production build before running this test.');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { publishPost } = require('../lib/publish-post.ts');
const { readTimeline, readFeedStatus, enrichPosts } = require('../lib/posts.ts');
const { feedFingerprint, feedHref, PHOTO_BUCKET } = require('../lib/feed-types.ts');
const { createServerClient } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key);
const jar = new Map();
const client = createServerClient(url, key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: items => items.forEach(({name,value}) => value ? jar.set(name,value) : jar.delete(name)) } });
const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const fixture = { marker: crypto.randomUUID(), user: null, organization: null, posts: [], photos: [] };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/iVYAAAAASUVORK5CYII=', 'base64');
let application, server;
function form(kind = 'post', extra = {}) {
  const data = new FormData();
  for (const [k,v] of Object.entries({ kind, title: '[Tijdelijke technische test] Homepage', body: 'Dit is uitsluitend een tijdelijke technische controle van de homepage.', subjectName: 'Technische test', category: 'overig', sourceUrl: kind === 'post' ? 'https://supabase.com/docs' : '', photoAlt: 'Tijdelijk testbeeld van één pixel', ...extra })) data.set(k,v);
  if (kind === 'photo' && !data.has('photo')) data.set('photo', new File([png], 'test.png', {type:'image/png'}));
  return data;
}
function request(route, authenticated = true) {
  return new Promise((resolve,reject) => {
    const req = http.get({hostname:'127.0.0.1',port:3106,path:route,headers:authenticated ? {cookie:[...jar].map(([k,v])=>`${k}=${v}`).join(';')} : {}}, res => { let body=''; res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body})); });
    req.setTimeout(90000,()=>req.destroy(new Error('Page timeout'))); req.on('error',reject);
  });
}
(async () => {
  assert.equal(feedHref('photo',false,'media',2), '/feed?type=photo&sort=nieuw&onderwerp=media&pagina=2');
  const signup = await client.auth.signUp({email:`vardena-feed-test-${fixture.marker}@example.invalid`,password:crypto.randomBytes(30).toString('base64url'),options:{data:{display_name:'Tijdelijke homepagetest'}}});
  assert.equal(signup.error,null); assert.ok(signup.data.session); fixture.user = signup.data.user.id;
  console.log('FIXTURE_USER',fixture.user);
  await client.from('vardena_members').insert({id:fixture.user,display_name:'Homepagetest',username:'feedtest_'+fixture.marker.slice(0,8),bio:''});
  const org = await client.from('vardena_organizations').insert({created_by:fixture.user,name:'Tijdelijke homepagetest',slug:'feed-test-'+fixture.marker.slice(0,8),summary:'Tijdelijke technische controle van de homepage.',mission:'Dit is uitsluitend een technische test van de homepage.',positions:'Geen publieke standpunten, dit is alleen een tijdelijke test.',approach:'De testgegevens worden na afloop verwijderd.',manifesto:''}).select('id,slug').single();
  assert.equal(org.error,null); fixture.organization=org.data; console.log('FIXTURE_ORG',org.data.id);
  if (process.env.FEED_PAGE_ONLY !== '1') {
  const invalid = await Promise.all([
    publishPost(client,fixture.user,form('post',{sourceUrl:''})),
    publishPost(client,fixture.user,form('post',{sourceUrl:'javascript:alert(1)'})),
    publishPost(client,fixture.user,form('photo',{photo:new File(['not an image'],'fake.png',{type:'image/png'})})),
    publishPost(client,fixture.user,form('photo',{photo:new File([new Uint8Array(3145729)],'large.png',{type:'image/png'})})),
    publishPost(client,fixture.user,form('photo',{photoAlt:'x'})),
    publishPost(client,fixture.user,form('announcement'),crypto.randomUUID()),
  ]);
  invalid.forEach(r=>assert.ok(r.error)); console.log('PASS source, size, file signature, alt text and organization authorization');
  const draftPath = `${fixture.user}/${crypto.randomUUID()}.png`; fixture.photos.push(draftPath);
  assert.equal((await client.storage.from(PHOTO_BUCKET).upload(draftPath,png,{contentType:'image/png'})).error,null);
  assert.ok((await anon.storage.from(PHOTO_BUCKET).createSignedUrl(draftPath,60)).error);
  assert.ok((await client.storage.from(PHOTO_BUCKET).upload(`${crypto.randomUUID()}/${crypto.randomUUID()}.png`,png,{contentType:'image/png'})).error);
  console.log('PASS unpublished photo privacy and foreign upload denial');
  }
  for (const kind of ['post','announcement','photo']) {
    const result = await publishPost(client,fixture.user,form(kind),kind==='announcement'?org.data.id:null);
    assert.equal(result.error,undefined); fixture.posts.push(result.id);
  }
  console.log('PASS all three publication types, including organization announcement');
  const photo = await client.from('posts').select('id,media_path').eq('id',fixture.posts[2]).single();
  assert.equal(photo.error,null); fixture.photos.push(photo.data.media_path);
  if (process.env.FEED_PAGE_ONLY !== '1') {
  const signed = await anon.storage.from(PHOTO_BUCKET).createSignedUrl(photo.data.media_path,60);
  assert.equal(signed.error,null); assert.equal((await fetch(signed.data.signedUrl)).status,200);
  assert.ok((await client.storage.from(PHOTO_BUCKET).upload(photo.data.media_path,png,{contentType:'image/png',upsert:true})).error);
  const removed = await client.storage.from(PHOTO_BUCKET).remove([photo.data.media_path]); assert.ok(removed.error || !removed.data.length);
  console.log('PASS public photo viewing, overwrite and referenced deletion protection');
  }
  await Promise.all(['post','announcement','photo'].flatMap((kind,i)=>[true,false].map(async popular=>{
    const result = await readTimeline(anon,1,popular,kind,'overig'); assert.equal(result.error,null); assert.ok(result.data.some(p=>p.id===fixture.posts[i])); assert.ok(result.data.every(p=>p.kind===kind&&p.category==='overig'));
  })));
  const status = await readFeedStatus(anon,1,false,'photo','overig');
  const raw = await readTimeline(anon,1,false,'photo','overig');
  const rich = await enrichPosts(anon,raw.data);
  assert.equal(feedFingerprint(rich,raw.count),feedFingerprint(status.data,status.count)); assert.ok(rich.find(p=>p.id===photo.data.id).photoUrl);
  console.log('PASS combined filters, both sort orders, photo enrichment and live fingerprint');
  application = require('next')({dev:false,dir:root,hostname:'127.0.0.1',port:3106});
  await application.prepare(); server=http.createServer(application.getRequestHandler()); await new Promise(resolve=>server.listen(3106,'127.0.0.1',resolve));
  const pages = await Promise.all([
    request('/feed'), request('/feed?type=photo&sort=nieuw&onderwerp=overig',false), request('/feed?type=announcement',false), request('/api/feed/status?type=photo&sort=nieuw&onderwerp=overig',false), request(`/bericht/${photo.data.id}`,false), request(`/organisaties/${org.data.slug}/groep?tab=publiceren`),
  ]);
  pages.forEach(r=>{assert.equal(r.status,200);assert.ok(!r.body.includes('Er ging iets mis'));});
  assert.ok(pages[0].body.includes('Jouw tijdlijn.')); assert.ok(pages[0].body.includes('Plaatsen als')); assert.ok(pages[0].body.includes('Mijn groepen'));
  assert.ok(pages[1].body.includes('Tijdelijk testbeeld van één pixel')); assert.ok(pages[1].body.includes('storage/v1/object/sign/'));
  assert.ok(pages[2].body.includes('Mededeling')); assert.ok(pages[2].body.includes('Tijdelijke homepagetest'));
  assert.equal(JSON.parse(pages[3].body).fingerprint,feedFingerprint(status.data,status.count)); assert.ok(pages[3].headers['cache-control'].includes('no-store'));
  assert.ok(pages[4].body.includes('Tijdelijk testbeeld van één pixel')); assert.ok(pages[5].body.includes('Wat wil je plaatsen?'));
  console.log('HOME_FEED_TESTS_PASSED');
})().catch(error=>{console.error('FAIL',error.message);process.exitCode=1;}).finally(async()=>{
  if (fixture.posts.length) { const r=await client.from('posts').delete().in('id',fixture.posts);if(r.error)console.error('POST_CLEANUP_FAILED',r.error.code); }
  if (fixture.photos.length) { const r=await client.storage.from(PHOTO_BUCKET).remove(fixture.photos);if(r.error)console.error('PHOTO_CLEANUP_FAILED',r.error.message); }
  await client.auth.signOut(); console.log('REVOKED_SESSION_CLEANUP',JSON.stringify({user:fixture.user,organization:fixture.organization?.id}));
  if(server)await new Promise(resolve=>server.close(resolve));if(application)await application.close();
});
