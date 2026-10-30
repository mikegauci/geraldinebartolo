import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { load } from 'cheerio';
const routes=JSON.parse(await readFile('src/content/routes.json','utf8'));
const hashes=JSON.parse(await readFile('migration/content-hashes.json','utf8'));
let checks=0;const errors=[];
for(const {route,key} of routes){
 const file=`dist/${route ? route+'/' : ''}index.html`;
 const $=load(await readFile(file,'utf8'));
 if(!$('title').text())errors.push(`${route}: missing title`);
 if(!$('#content').length)errors.push(`${route}: missing content`);
 for(const el of $('[src],link[href],a[href]').toArray()){
  const value=$(el).attr('src')||$(el).attr('href');
  if(!value?.startsWith('/')||value.startsWith('//'))continue;
  const path=decodeURIComponent(value.split(/[?#]/)[0]);
  const target=path.startsWith('/assets/')?`dist${path}`:`dist${path.endsWith('/')?path:path+'/'}index.html`;
  try{await access(target);checks++;}catch{errors.push(`${route}: missing ${path}`);}
 }
 const after=$('#content').text().replace(/\s+/g,' ').trim();
 if(createHash('sha256').update(after).digest('hex')!==hashes[key])errors.push(`${route}: content changed`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Verified ${routes.length} routes, ${checks} local references, and unchanged page text.`);
