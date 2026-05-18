import { createServer } from 'http';
import fs from 'fs';
import { createApp } from '../server/_core/index';

async function run() {
  const app = createApp();
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  // @ts-ignore
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;

  const url = `http://127.0.0.1:${port}/feed.xml`;
  console.log('Fetching feed from', url);

  try {
    const res = await fetch(url, { timeout: 10000 });
    const text = await res.text();
    await fs.promises.mkdir('tmp', { recursive: true });
    await fs.promises.writeFile('tmp/feed-output.xml', text, 'utf-8');
    console.log('Wrote tmp/feed-output.xml — length:', text.length);
    console.log(text.split('\n').slice(0, 40).join('\n'));
  } catch (err) {
    console.error('Failed to fetch feed:', err);
  } finally {
    server.close();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
