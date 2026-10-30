import routes from '../content/routes.json';
export function GET() {
  const pages = routes.map(({route}) => `<url><loc>https://www.geraldinebartolo.com/${route}${route ? '/' : ''}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages}</urlset>`, {headers:{'Content-Type':'application/xml'}});
}
