import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const port = 4407;
const base = `http://127.0.0.1:${port}`;
const out = path.resolve('docs/screenshots');

const server = spawn('npx', ['serve', '-s', 'dist', '-l', String(port)], {
  stdio: 'ignore',
  detached: false,
});

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base);
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting while serve boots
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The web preview did not start.');
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name), fullPage: true });
}

try {
  await mkdir(out, { recursive: true });
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(base);
  await page.getByRole('button', { name: 'Try the demo' }).waitFor();
  await shot(page, 'welcome.png');

  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name: 'Harbor & Co, Lena Okonkwo' }).waitFor();
  await shot(page, 'demo.png');

  await page.getByRole('button', { name: 'Harbor & Co, Lena Okonkwo' }).click();
  await page.getByText('Needs your eye').waitFor();
  await shot(page, 'client-home.png');

  await page.getByRole('button', { name: 'Cover still, Spring Lookbook' }).click();
  await page.getByRole('button', { name: 'Approve' }).waitFor();
  await shot(page, 'review.png');

  const studio = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await studio.goto(base);
  await studio.getByRole('button', { name: 'Try the demo' }).click();
  await studio.getByRole('button', { name: 'Northline Studio, Amira Shah' }).click();
  await studio.getByRole('heading', { name: 'Approval queue' }).waitFor();
  await shot(studio, 'agency-queue.png');

  await studio.getByRole('tab', { name: 'More' }).click();
  await studio.getByRole('button', { name: 'Dark room' }).click();
  await studio.getByText('Dark room · on').waitFor();
  await shot(studio, 'more-dark.png');
  await studio.goto(`${base}/queue`);
  await studio.getByRole('heading', { name: 'Approval queue' }).waitFor();
  await shot(studio, 'agency-queue-dark.png');

  await browser.close();
} finally {
  server.kill('SIGTERM');
}
