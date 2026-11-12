import { NextResponse } from 'next/server';

const TITLES = {
  admin: 'Admin Portal API',
  user: 'User Application API',
  landing: 'Landing Page API',
};
const SWAGGER = 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14';

export async function GET(_: Request, ctx: RouteContext<'/docs/[name]'>) {
  const { name } = await ctx.params;
  if (!(name in TITLES))
    return NextResponse.json({ error: { code: 'not_found' } }, { status: 404 });
  const title = TITLES[name as keyof typeof TITLES];
  const nav = Object.entries(TITLES)
    .map(([k, v]) => `<a href="/docs/${k}"${k === name ? ' class="on"' : ''}>${v}</a>`)
    .join('');
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kanaku · ${title}</title><link rel="stylesheet" href="${SWAGGER}/swagger-ui.min.css">
<style>body{margin:0;font-family:system-ui,sans-serif}nav{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;background:#0b1220}
nav a{color:#cbd5e1;text-decoration:none;padding:6px 12px;border-radius:8px;font-size:14px}nav a.on{background:#1d4ed8;color:#fff}</style></head>
<body><nav>${nav}</nav><div id="ui"></div>
<script src="${SWAGGER}/swagger-ui-bundle.min.js"></script>
<script>SwaggerUIBundle({url:'/openapi/${name}',dom_id:'#ui',deepLinking:true,tryItOutEnabled:false})</script></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}
