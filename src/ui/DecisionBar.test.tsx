import { fireEvent, render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeProvider';
import { DecisionBar } from '@/ui/DecisionBar';

async function renderBar(note: string, onChangeNote = jest.fn()) {
  const onApprove = jest.fn();
  const onRequestChanges = jest.fn();
  const view = await render(
    <ThemeProvider>
      <DecisionBar
        status="in_review"
        note={note}
        onChangeNote={onChangeNote}
        onApprove={onApprove}
        onRequestChanges={onRequestChanges}
      />
    </ThemeProvider>,
  );
  return {
    getByRole: view.getByRole,
    getByLabelText: view.getByLabelText,
    onApprove,
    onRequestChanges,
    onChangeNote,
  };
}

describe('DecisionBar', () => {
  it('keeps request changes unavailable until there is a note', async () => {
    const screen = await renderBar('');
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeDisabled();
    fireEvent.press(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.onApprove).toHaveBeenCalledTimes(1);
    expect(screen.onRequestChanges).not.toHaveBeenCalled();
  });

  it('sends the change request once a note is written', async () => {
    const ready = await renderBar('Give the navy look a full bleed.');
    expect(ready.getByRole('button', { name: 'Request changes' })).not.toBeDisabled();
    fireEvent.press(ready.getByRole('button', { name: 'Request changes' }));
    expect(ready.onRequestChanges).toHaveBeenCalledTimes(1);
  });
});
