import { createMemoryPersistence } from '@/data/persistence';
import { createMockRepository } from '@/data/mockRepository';
import { DEMO_IDS, INTERNAL_NOTE } from '@/data/seed';
import { WorkroomError } from '@/data/errors';

function repo() {
  return createMockRepository({ persistence: createMemoryPersistence() });
}

describe('mock repository role separation', () => {
  it('signs Lena into Harbor and hides every other client', async () => {
    const store = repo();
    const actor = await store.signInAsDemo(DEMO_IDS.lena, DEMO_IDS.harbor);
    expect(actor.role).toBe('client_admin');
    expect(actor.activeOrgId).toBe(DEMO_IDS.harbor);

    const projects = await store.listProjects();
    expect(projects.map((item) => item.name)).toEqual(
      expect.arrayContaining(['Spring Lookbook', 'Homepage refresh']),
    );
    expect(projects.map((item) => item.clientName)).not.toContain('Lumen Health');
    expect(projects.map((item) => item.clientName)).not.toContain('Fieldnote Press');

    const lookbook = await store.getProject(DEMO_IDS.lookbook);
    const titles = lookbook.deliverables.map((item) => item.title);
    expect(titles).toContain('Cover still');
    expect(titles).not.toContain('Printer contact sheet');
    expect(JSON.stringify(lookbook)).not.toContain(INTERNAL_NOTE);
    expect(lookbook.threads.map((item) => item.id)).not.toContain(DEMO_IDS.lookbookInternal);

    await expect(store.getProject(DEMO_IDS.film)).rejects.toMatchObject({ code: 'not_found' });
    await expect(store.getDeliverable(DEMO_IDS.contact)).rejects.toMatchObject({ code: 'not_found' });
    await expect(store.getThread(DEMO_IDS.lookbookInternal)).rejects.toMatchObject({ code: 'not_found' });
    await expect(store.listApprovalQueue()).rejects.toMatchObject({ code: 'forbidden' });
    await expect(store.listClients()).rejects.toMatchObject({ code: 'forbidden' });

    const pdf = await store.getDeliverable(DEMO_IDS.pdf);
    expect(pdf.comments.some((item) => item.body.includes('full bleed'))).toBe(true);
    expect(pdf.comments.some((item) => item.body === INTERNAL_NOTE)).toBe(false);
  });

  it('lets the studio see both clients and the internal note', async () => {
    const store = repo();
    const actor = await store.signInWithPassword('amira@northline.example', 'northline-demo');
    expect(actor.role).toBe('agency_owner');

    const queue = await store.listApprovalQueue();
    const clients = queue.map((item) => item.clientName);
    expect(clients).toEqual(expect.arrayContaining(['Harbor & Co', 'Lumen Health', 'Fieldnote Press']));

    const pdf = await store.getDeliverable(DEMO_IDS.pdf);
    expect(pdf.comments.some((item) => item.body === INTERNAL_NOTE)).toBe(true);
    expect(pdf.canDecide).toBe(false);
    expect(pdf.canWriteInternal).toBe(true);

    const contact = await store.getDeliverable(DEMO_IDS.contact);
    expect(contact.title).toBe('Printer contact sheet');

    await expect(
      store.decideDeliverable(DEMO_IDS.cover, { decision: 'approve', comment: '' }),
    ).rejects.toMatchObject({ code: 'forbidden' });

    const replied = await store.addDeliverableNote(DEMO_IDS.cover, {
      body: 'Updated the crop to the approved grid.',
      visibility: 'client',
    });
    expect(replied.comments.at(-1)?.body).toBe('Updated the crop to the approved grid.');
  });

  it('switches Casey between a client portal and the studio queue', async () => {
    const store = repo();
    await store.signInAsDemo(DEMO_IDS.casey, DEMO_IDS.fieldnote);
    const clientProjects = await store.listProjects();
    expect(clientProjects.map((item) => item.name)).toEqual(['Field guide reprint']);
    expect(JSON.stringify(clientProjects)).not.toContain('Harbor');
    await expect(store.listApprovalQueue()).rejects.toBeInstanceOf(WorkroomError);

    const studio = await store.switchOrganization(DEMO_IDS.northline);
    expect(studio.role).toBe('agency_member');
    const queue = await store.listApprovalQueue();
    expect(queue.length).toBeGreaterThan(1);
    expect(queue.some((item) => item.clientName === 'Harbor & Co')).toBe(true);

    await store.switchOrganization(DEMO_IDS.fieldnote);
    await expect(store.getProject(DEMO_IDS.lookbook)).rejects.toMatchObject({ code: 'not_found' });
    const threads = await store.listThreads();
    expect(threads).toHaveLength(0);
  });

  it('approves and requests changes, then keeps the decision after reload', async () => {
    const persistence = createMemoryPersistence();
    const store = createMockRepository({
      persistence,
      now: () => '2026-11-25T09:00:00.000Z',
    });
    await store.signInAsDemo(DEMO_IDS.lena, DEMO_IDS.harbor);

    await expect(
      store.decideDeliverable(DEMO_IDS.hero, { decision: 'request_changes', comment: '   ' }),
    ).rejects.toMatchObject({ code: 'invalid' });

    const changed = await store.decideDeliverable(DEMO_IDS.hero, {
      decision: 'request_changes',
      comment: 'Give the coat more room on the right.',
    });
    expect(changed.status).toBe('changes_requested');

    const approved = await store.decideDeliverable(DEMO_IDS.cover, {
      decision: 'approve',
      comment: 'Yes, print it.',
    });
    expect(approved.status).toBe('approved');
    expect(approved.comments.some((item) => item.body === 'Yes, print it.')).toBe(true);

    const reloaded = createMockRepository({ persistence });
    const actor = await reloaded.restore();
    expect(actor?.userId).toBe(DEMO_IDS.lena);
    const cover = await reloaded.getDeliverable(DEMO_IDS.cover);
    expect(cover.status).toBe('approved');
  });

  it('notifies the studio when a client decides', async () => {
    const persistence = createMemoryPersistence();
    const client = createMockRepository({ persistence, now: () => '2026-11-25T10:00:00.000Z' });
    await client.signInAsDemo(DEMO_IDS.lena, DEMO_IDS.harbor);
    await client.decideDeliverable(DEMO_IDS.cover, { decision: 'approve', comment: 'Yes, print it.' });

    const studio = createMockRepository({ persistence });
    await studio.signInAsDemo(DEMO_IDS.amira, DEMO_IDS.northline);
    const alerts = await studio.listNotifications();
    expect(alerts.some((item) => item.title.includes('approved Cover still'))).toBe(true);
  });

  it('issues a one-time magic link without confirming unknown emails', async () => {
    const store = repo();
    const missing = await store.requestMagicLink('nobody@example.com');
    expect(missing).toEqual({ accepted: true });

    const sent = await store.requestMagicLink('lena@harborandco.example');
    expect(sent.demoPath).toContain('/auth/callback?token=');
    const token = new URL(`https://workroom.test${sent.demoPath ?? ''}`).searchParams.get('token');
    const actor = await store.consumeMagicLink(token ?? '');
    expect(actor.email).toBe('lena@harborandco.example');
    await expect(store.consumeMagicLink(token ?? '')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('posts a client message the studio can read, and hides studio-only threads', async () => {
    const persistence = createMemoryPersistence();
    const client = createMockRepository({ persistence, now: () => '2026-11-25T11:00:00.000Z' });
    await client.signInAsDemo(DEMO_IDS.lena, DEMO_IDS.harbor);
    const thread = await client.postMessage(DEMO_IDS.lookbookThread, 'Can we see the navy look larger?');
    expect(thread.messages.at(-1)?.body).toContain('navy look');

    const clientThreads = await client.listThreads();
    expect(clientThreads.map((item) => item.id)).not.toContain(DEMO_IDS.lookbookInternal);

    const studio = createMockRepository({ persistence });
    await studio.signInAsDemo(DEMO_IDS.amira, DEMO_IDS.northline);
    const studioThread = await studio.getThread(DEMO_IDS.lookbookThread);
    expect(studioThread.messages.at(-1)?.body).toContain('navy look');
    const internal = await studio.getThread(DEMO_IDS.lookbookInternal);
    expect(internal.messages[0]?.body).toContain('Retouch house');
  });

  it('rejects a bad password and a foreign organization switch', async () => {
    const store = repo();
    await expect(store.signInWithPassword('lena@harborandco.example', 'nope')).rejects.toMatchObject({
      code: 'invalid',
    });
    await store.signInAsDemo(DEMO_IDS.lena, DEMO_IDS.harbor);
    await expect(store.switchOrganization(DEMO_IDS.lumen)).rejects.toMatchObject({ code: 'forbidden' });
    const alerts = await store.listNotifications();
    expect(alerts.every((item) => item.href.startsWith('/'))).toBe(true);
    expect(alerts.some((item) => item.id === 'ntf_amira_pdf')).toBe(false);
  });
});
