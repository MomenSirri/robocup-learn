// Bundle the production build into one self-contained HTML file
// (used to publish the app as a page you can open on a phone).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = 'dist/assets/';
const files = readdirSync(dir);
const js = files.filter((f) => f.endsWith('.js')).map((f) => readFileSync(dir + f, 'utf8')).join('\n');
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(dir + f, 'utf8')).join('\n');
const out = `<title>CFOP Coach</title>
<meta name="theme-color" content="#0b0d12">
<style>:root{color-scheme:dark}html,body{height:100%;background:#0b0d12}${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(process.argv[2] ?? 'dist/cfop-coach.html', out);
console.log('wrote', out.length, 'bytes');
