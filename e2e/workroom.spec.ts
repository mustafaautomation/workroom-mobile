import { expect, test, type Page } from '@playwright/test';

const INTERNAL_NOTE = 'Hold the retouch budget — do not mention the overage to Harbor.';

async function enterDemo(page: Page, name: string) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await page.getByRole('button', { name }).click();
}

test('a client reviews Harbor work and cannot see another client or internal notes', async ({ page }) => {
  await enterDemo(page, 'Harbor & Co, Lena Okonkwo');
  await expect(page.getByText('Spring Lookbook').first()).toBeVisible();
  await expect(page.getByText('Homepage refresh').first()).toBeVisible();
  await expect(page.getByText('Lumen Health')).toHaveCount(0);
  await expect(page.getByText('Fieldnote Press')).toHaveCount(0);
  await expect(page.getByText(INTERNAL_NOTE)).toHaveCount(0);
  await expect(page.getByText('Printer contact sheet')).toHaveCount(0);

  await page.getByRole('button', { name: 'Lookbook PDF, Spring Lookbook' }).click();
  await expect(page.getByText('The navy look on page 12 is too small.')).toBeVisible();
  await expect(page.getByText(INTERNAL_NOTE)).toHaveCount(0);
  await expect(page.getByText('Harbor-Lookbook-v2.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Go back' }).click();

  await page.getByRole('button', { name: 'Cover still, Spring Lookbook' }).click();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();
});

test('a client requests changes with a note', async ({ page }) => {
  await enterDemo(page, 'Harbor & Co, Lena Okonkwo');
  await page.getByRole('button', { name: 'Homepage hero, Homepage refresh' }).click();
  await page.getByRole('textbox', { name: 'Note for the studio' }).fill('Give the coat more room on the right.');
  await page.getByRole('button', { name: 'Request changes' }).click();
  const changeNote = page.getByText('Give the coat more room on the right.');
  await changeNote.scrollIntoViewIfNeeded();
  await expect(changeNote).toBeVisible();
});

test('the studio sees every client and the internal note, then replies', async ({ page }) => {
  await enterDemo(page, 'Northline Studio, Amira Shah');
  await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
  await expect(page.getByText('Harbor & Co').first()).toBeVisible();
  await expect(page.getByText('Lumen Health').first()).toBeVisible();
  await expect(page.getByText('Fieldnote Press').first()).toBeVisible();

  await page.getByRole('button', { name: 'Harbor & Co, Lookbook PDF' }).click();
  await expect(page.getByText(INTERNAL_NOTE)).toBeVisible();
  await expect(page.getByText('Internal — clients never see this')).toBeVisible();
  await page.getByLabel('Reply to the client').fill('Updated the crop to the approved grid.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByText('Updated the crop to the approved grid.')).toBeVisible();
});

test('Casey switches from a client portal to the studio queue', async ({ page }) => {
  await enterDemo(page, 'Fieldnote Press, Casey Lin');
  await expect(page.getByText('Field guide reprint').first()).toBeVisible();
  await expect(page.getByText('Spring Lookbook')).toHaveCount(0);
  await expect(page.getByText(INTERNAL_NOTE)).toHaveCount(0);

  await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Switch to Northline Studio' }).click();
  await expect(page.getByRole('heading', { name: 'Approval queue' })).toBeVisible();
  await expect(page.getByText('Harbor & Co').first()).toBeVisible();
});

test('password sign-in and a magic link both open the Harbor portal', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Use Lena Okonkwo' }).click();
  await expect(page.getByText('Spring Lookbook').first()).toBeVisible();
  await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Email me a link' })).toBeVisible();

  await page.getByRole('button', { name: 'Email me a link' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('lena@harborandco.example');
  await page.getByRole('button', { name: 'Send magic link' }).click();
  await page.getByRole('button', { name: 'Open the demo inbox link' }).click();
  await expect(page.getByText('Spring Lookbook').first()).toBeVisible();
});
