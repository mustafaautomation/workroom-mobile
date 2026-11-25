import { formatDate, inkOn, initials, roleLabel, statusLabel } from '@/domain/format';

describe('formatters', () => {
  it('formats dates in UTC and labels roles without color alone', () => {
    expect(formatDate('2026-11-24T15:00:00.000Z')).toBe('24 Nov 2026');
    expect(roleLabel('client_admin')).toBe('Client admin');
    expect(statusLabel('changes_requested')).toBe('Changes requested');
    expect(initials('Lena Okonkwo')).toBe('LO');
    expect(inkOn('#1F4E5A')).toBe('#F7F1E8');
    expect(inkOn('#F4EFE6')).toBe('#1C1712');
  });
});
