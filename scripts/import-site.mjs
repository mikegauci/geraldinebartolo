import { load } from 'cheerio';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const origin = 'https://www.geraldinebartolo.com';
const routes = ['', 'services', 'experience-and-projects', 'hello-world', 'portfolio', 'testimonial', 'category/uncategorized', 'author/admin'];
const assets = new Map();
const failures = [];
const get = url => execFileSync('curl', ['--fail','-L','-s','--max-time','60',url], {maxBuffer:50*1024*1024});
async function asset(value, base=origin) {
 if (!value || /^(data:|#)/.test(value)) return value;
 let url=new URL(value,base); if (!/^https?:$/.test(url.protocol)) return value;
 // Use the original uploads, removing Jetpack's dependency on WordPress image proxies.
 // Keep CDN resize parameters: intrinsic image dimensions affect the original layout.
 if (url.hostname==='www.geraldinebartolo.com') url.search='';
 const key=url.href;
 if (assets.has(key)) return assets.get(key);
 const ext=url.pathname.match(/\.[a-z0-9]{2,5}$/i)?.[0] || (url.hostname==='fonts.googleapis.com'?'.css':'.bin');
 const name=`/assets/${createHash('sha256').update(key).digest('hex').slice(0,12)}${ext}`;
 assets.set(key,name);
 try {
  try { await access(`public${name}`); return name; } catch {}
  let data=get(key);
  if (ext==='.css') data=Buffer.from(await css(data.toString(),key));
  await writeFile(`public${name}`,data);
 } catch(e) {failures.push(key); assets.delete(key); throw new Error(`Asset download failed: ${key}`);}
 return name;
}
async function css(text,base) {
 for (const match of [...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g)]) {
  if (match[2].startsWith('data:')||match[2].startsWith('#')) continue;
  const local=await asset(match[2],base); text=text.replaceAll(match[0],`url("${local}")`);
 }
 return text;
}
const pages=[];const hashes={};
for (const route of routes) {
 const url=`${origin}/${route}${route?'/':''}`;
 let raw;try {raw=get(url).toString();}catch {console.log('Skipping unavailable route:',route);continue;}
 await writeFile(`migration/${route.replaceAll('/','-')||'home'}.source.html`,raw);
 const baseline=load(raw);baseline('script,noscript').remove();hashes[route.replaceAll('/','-')||'home']=createHash('sha256').update(baseline('#content').text().replace(/\s+/g,' ').trim()).digest('hex');
 const $=load(raw);const key=route.replaceAll('/','-')||'home';
 // Keep SEO, CSS and original block markup; remove WordPress service discovery and trackers.
 $('link[href*="c0.wp.com/p/jetpack"]').remove();
 $('head script, head link:not([rel="stylesheet"]):not([rel="icon"]):not([rel="apple-touch-icon"]):not([rel="canonical"]),meta[name="generator"],meta[name="msapplication-TileImage"]').remove();
 for(const el of $('link[rel="stylesheet"],link[rel="icon"],link[rel="apple-touch-icon"]').toArray()) {const v=$(el).attr('href');if(v)$(el).attr('href',await asset(v));}
 for(const el of $('style').toArray())$(el).text(await css($(el).text(),url));
 $('body script, noscript, .jp-carousel-overlay, #wpadminbar').remove();
 $('form').attr('action', '#');
 $('form button[type=submit],form input[type=submit]').attr('disabled', 'disabled').attr('title', 'Archived WordPress form; use the email link to get in touch.');
 for(const el of $('img').toArray()) {
  const img=$(el);let src=img.attr('src');if(!src||src.startsWith('data:'))src=img.attr('data-lazy-src')?.replace(/[?&]is-pending-load=1/,'');
  if(src)img.attr('src',await asset(src));
  img.removeAttr('srcset sizes');
  for(const attr of Object.keys(el.attribs))if(attr.startsWith('data-'))img.removeAttr(attr);
  img.removeClass('jetpack-lazy-image');
 }
 for(const el of $('[style]').toArray())$(el).attr('style',await css($(el).attr('style'),url));
 for(const el of $('a[href]').toArray()) {
  const a=$(el),href=a.attr('href');
  if (/^mailto:|^malito:|^mailt$/.test(href)) {a.attr('href','mailto:hello@geraldinebartolo.com');continue;}
  if(href.includes('/wp-content/uploads/')) a.attr('href',await asset(href));
  else if(href.startsWith(origin)) a.attr('href',href.slice(origin.length)||'/');
 }
 // Preserve the theme's small, standalone responsive navigation implementation.
 const themeScript=await asset(`${origin}/wp-content/themes/astra/assets/js/minified/frontend.min.js`);
 const astraMatch=raw.match(/var astra = (\{[^\n]*\});/);
 const runtime=astraMatch?astraMatch[1]:null;
 const page={key,route,title:$('title').text(),bodyClass:$('body').attr('class'),head:$('head').html(),content:$('#content').toString(),themeScript,astra:runtime?JSON.parse(runtime.trim().replace(/;+$/, '')):null};
 // Header/footer stay separate so a CMS can later replace only the page content provider.
 await writeFile(`src/content/pages/${key}.json`,JSON.stringify(page,null,2));
 await writeFile(`src/content/pages/${key}.header.html`,$('#masthead').toString());
 await writeFile(`src/content/pages/${key}.footer.html`,$('#colophon').toString());
 pages.push({key,route,title:page.title});console.log(`Imported /${route}: ${assets.size} assets`);
}
await writeFile('migration/content-hashes.json',JSON.stringify(hashes,null,2));
await writeFile('src/content/routes.json',JSON.stringify(pages,null,2));
await writeFile('migration/assets.json',JSON.stringify(Object.fromEntries(assets),null,2));
console.log(`Complete: ${pages.length} pages, ${assets.size} local assets`);
