import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicText = name => readFile(join(root, 'public', name), 'utf8');
const [store, chat, storeCSS, chatCSS, storefront, assistant, launcher, worker, image] = await Promise.all([
  publicText('index.html'), publicText('assistant.html'), publicText('store.css'), publicText('app.css'),
  publicText('store.js'), publicText('app.js'), publicText('widget.js'),
  readFile(join(root, 'dist', 'server', 'index.js'), 'utf8'),
  readFile(join(root, 'public', 'groceries.jpg'), 'base64'),
]);
const languageHelpers = (await publicText('language.js')).replace(/^export /gm, '');
const shoppingHelpers = (await publicText('shopping.js')).replace(/^export /gm, '');
const markImage = 'data:image/svg+xml;base64,' + Buffer.from(await publicText('coop-mark.svg')).toString('base64');
const customerHelpers = (await publicText('customer-copy.js')).replace(/^export /gm, '');
const productPreviewHelpers = (await publicText('product-preview.js')).replace(/^export /gm, '');
const workerSource = worker.slice(worker.indexOf('const DATA = ')).replace('export default {', 'return {');
const inline = value => value.replace(/<\/script/gi, '<\\/script');
const dataImage = 'data:image/jpeg;base64,' + image;
const transport = 'const previewWorker = (() => { const ASSETS = {}; ' + workerSource + '\n})();\n' +
  'const previewFetch = (path, options) => previewWorker.fetch(new Request("https://makhazen.demo" + path, options));\n';

function inject(document, cssPath, css, code) {
  return document
    .replace(/  <link rel="preconnect".*\r?\n/g, '')
    .replace(/  <link href="https:\/\/fonts.googleapis.com.*\r?\n/g, '')
    .replace('<link rel="stylesheet" href="' + cssPath + '">', () => '<style>\n' +
      css.replaceAll('/groceries.jpg', dataImage) + '\n</style>')
    .replace(/ *<script[^>]* src="\/[^"]+"[^>]*><\/script>\r?\n/g, '')
    .replace('href="/"', 'href="#"')
    .replace('</body>', () => '<script type="module">\n' + inline(code) + '\n</script>\n</body>');
}

const chatApp = languageHelpers + '\n' + customerHelpers + '\n' + shoppingHelpers + '\n' + productPreviewHelpers + '\n' + assistant
  .replace(/^import .* from '\.\/shopping\.js';\r?\n/m, '')
  .replaceAll("'/coop-mark.svg'", JSON.stringify(markImage))
  .replace(/^import .* from '\.\/language\.js';\r?\n/m, '')
  .replace(/^import .* from '\.\/customer-copy\.js';\r?\n/m, '')
  .replace(/^import .* from '\.\/product-preview\.js';\r?\n/m, '')
  .replaceAll("fetch('/api/", "previewFetch('/api/")
  .replace("const savedLanguage = ", "const savedLanguage = window.name.endsWith('-ar') ? 'ar' : ")
  .replace("const widgetMode = params.get('widget') === '1';", 'const widgetMode = true;')
  .replace("const parentOrigin = params.get('parent') || window.location.origin;", "const parentOrigin = '*';")
  .replaceAll("event.source === window.parent && event.origin === parentOrigin &&", "event.source === window.parent &&");
const chatHTML = inject(chat.replaceAll('/coop-mark.svg',markImage), '/app.css', chatCSS, transport + chatApp);

const launcherScript = launcher
  .replace('const script = document.currentScript;', 'const script = { src: "https://makhazen.demo/widget.js", dataset: {} };')
  .replace("iframe.hasAttribute('src')", "iframe.hasAttribute('srcdoc')")
  .replace("iframe.src = origin + '/assistant.html?widget=1&lang=' + lang + '&parent=' + encodeURIComponent(location.origin);",
    'iframe.name = "makhazen-widget-" + lang;\n      iframe.srcdoc = previewChat;')
  .replaceAll("},origin);", "},'*');")
  .replace("image.src=origin+'/coop-mark.svg'", 'image.src='+JSON.stringify(markImage))
  .replace("event.origin!==origin||event.source!==iframe.contentWindow", "event.source !== iframe.contentWindow");
const storefrontScript = shoppingHelpers + '\n' + storefront.replace(/^import .* from '\.\/shopping\.js';\r?\n/m, '')
  .replace("if (!listFrame.hasAttribute('src')) listFrame.src = '/shopping-list.html?parent=' + encodeURIComponent(location.origin);", "if (!listFrame.hasAttribute('srcdoc')) { listFrame.name = 'makhazen-list-en'; listFrame.srcdoc = previewChat.replace('<html lang=\"en\" dir=\"ltr\">', '<html lang=\"en\" dir=\"ltr\" class=\"list-only\" data-view=\"list\">').replace('<body>', '<body class=\"list-only show-list\">'); }")
  .replaceAll("},location.origin);", "},'*');")
  .replaceAll("fetch('/api/", "previewFetch('/api/")
  .replace("image.src = category.image;", "image.src = category.image === '/groceries.jpg' ? previewImage : category.image;");
const extra = 'const previewChat = ' + JSON.stringify(chatHTML).replace(/</g, '\\u003c') + ';\nconst previewImage = ' +
  JSON.stringify(dataImage) + ';\n';
const result = inject(store, '/store.css', storeCSS, transport + extra + storefrontScript + '\n' + launcherScript);
const destination = resolve(process.argv[2] || 'Al_Makhazen_Storefront_Demo.html');
await writeFile(destination, result);
console.log('Built ' + destination);
