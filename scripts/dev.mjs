import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import worker from '../dist/server/index.js';

const port = Number(process.env.MAKHAZEN_PORT || 4173);
const host = '127.0.0.1';

createServer(async (incoming, outgoing) => {
  const controller = new AbortController();
  outgoing.once('close', () => {
    if (!outgoing.writableEnded) controller.abort();
  });
  try {
    const hasBody = incoming.method !== 'GET' && incoming.method !== 'HEAD';
    const requestHost = incoming.headers.host === 'localhost:' + port ? incoming.headers.host : host + ':' + port;
    const request = new Request(new URL(incoming.url, 'http://' + requestHost), {
      method: incoming.method, headers: incoming.headers, signal: controller.signal,
      ...(hasBody && { body: Readable.toWeb(incoming), duplex: 'half' }),
    });
    const response = await worker.fetch(request, process.env);
    if (outgoing.destroyed) return;
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    if (outgoing.destroyed) return;
    outgoing.writeHead(500, { 'Content-Type': 'text/plain' });
    outgoing.end('The assistant could not process this request.');
  }
}).listen(port, host, () => console.log('Local demo: http://' + host + ':' + port));
