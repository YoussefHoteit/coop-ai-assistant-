import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const project = fileURLToPath(new URL('../', import.meta.url));
const staticFiles = {
  'index.html': 'text/html; charset=utf-8',
  'assistant.html': 'text/html; charset=utf-8',
  'store.css': 'text/css; charset=utf-8',
  'store.js': 'text/javascript; charset=utf-8',
  'widget-preview.html': 'text/html; charset=utf-8',
  'app.css': 'text/css; charset=utf-8',
  'app.js': 'text/javascript; charset=utf-8',
  'language.js': 'text/javascript; charset=utf-8',
  'widget.js': 'text/javascript; charset=utf-8',
  'groceries.jpg': 'image/jpeg',
};

const entries = await Promise.all(Object.entries(staticFiles).map(async ([file, type]) => {
  const binary = type.startsWith('image/');
  const body = await readFile(join(project, 'public', file), binary ? 'base64' : 'utf8');
  return ['/' + file, { type, body, binary }];
}));
const data = JSON.parse(await readFile(join(project, 'src', 'catalog.json'), 'utf8').then(value => value.replace(/^\uFEFF/, '')));
data.publicProducts = JSON.parse(await readFile(join(project, 'src', 'public-inventory.json'), 'utf8'));
data.screenshotProducts = JSON.parse(await readFile(join(project, 'src', 'screenshot-inventory.json'), 'utf8'));
data.catalogInventory = JSON.parse(gunzipSync(await readFile(join(project, 'src', 'inventory-catalog.json.gz'))).toString('utf8'));
if (data.catalogInventory.products.length !== data.catalogInventory.productCount ||
    new Set(data.catalogInventory.products.map(product => product.id)).size !== data.catalogInventory.productCount) {
  throw new Error('Catalog product count or identifiers are invalid');
}
try {
  data.approved = JSON.parse(await readFile(join(project, 'src', 'approved-inventory.json'), 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const nutrition = await readFile(join(project, 'src', 'nutrition.mjs'), 'utf8');
const language = (await readFile(join(project, 'public', 'language.js'), 'utf8')).replace(/^export /gm, '');
const inventorySearch = (await readFile(join(project, 'src', 'inventory-search.mjs'), 'utf8')).replace(/^export /gm, '');
const source = await readFile(join(project, 'src', 'worker.mjs'), 'utf8');
const worker = 'const ASSETS = ' + JSON.stringify(Object.fromEntries(entries)) + ';\nconst DATA = ' +
  JSON.stringify(data) + ';\n' + nutrition + '\n' + language + '\n' + inventorySearch + '\n' + source;
const output = join(project, 'dist');
const workerPath = join(output, 'server', 'index.js');
await mkdir(dirname(workerPath), { recursive: true });
await writeFile(workerPath, worker);
try {
  const manifest = await readFile(join(project, '.openai', 'hosting.json'));
  const manifestPath = join(output, '.openai', 'hosting.json');
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, manifest);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
console.log('Built ' + workerPath);
