import { DEMO_IDS } from '@/data/seed';

export interface DemoAccount {
  userId: string;
  orgId: string;
  name: string;
  orgName: string;
  roleLabel: string;
  detail: string;
  email: string;
  password: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    userId: DEMO_IDS.lena,
    orgId: DEMO_IDS.harbor,
    name: 'Lena Okonkwo',
    orgName: 'Harbor & Co',
    roleLabel: 'Client',
    detail: 'Reviews Harbor work only. Other clients stay out of this portal.',
    email: 'lena@harborandco.example',
    password: 'harbor-demo',
  },
  {
    userId: DEMO_IDS.amira,
    orgId: DEMO_IDS.northline,
    name: 'Amira Shah',
    orgName: 'Northline Studio',
    roleLabel: 'Studio',
    detail: 'Sees the approval queue across Harbor, Lumen, and Fieldnote.',
    email: 'amira@northline.example',
    password: 'northline-demo',
  },
  {
    userId: DEMO_IDS.casey,
    orgId: DEMO_IDS.fieldnote,
    name: 'Casey Lin',
    orgName: 'Fieldnote Press',
    roleLabel: 'Client, and a studio seat',
    detail: 'Opens as the client. Switch to Northline from More to see the queue.',
    email: 'casey@fieldnote.example',
    password: 'fieldnote-demo',
  },
];
