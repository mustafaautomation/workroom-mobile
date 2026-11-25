import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { formatDate } from '@/domain/format';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import { Body, Composer, QueryState, Screen, StackHeader, StatusPill } from '@/ui/components';
import { DecisionBar } from '@/ui/DecisionBar';
import { DeliverablePreview } from '@/ui/previews';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

export default function ReviewScreen() {
  const { deliverableId } = useLocalSearchParams<{ deliverableId: string }>();
  const { repo, revision, actor, commit } = useWorkspace();
  const { colors, fontFamily } = useWorkroomTheme();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useAsync(
    () => repo.getDeliverable(String(deliverableId)),
    [repo, revision, deliverableId, actor?.activeOrgId],
  );
  const deliverable = query.data;
  const tall =
    deliverable?.previewKey === 'lookbook-cover' ||
    deliverable?.previewKey === 'lookbook-pdf' ||
    deliverable?.previewKey === 'fieldguide' ||
    deliverable?.previewKey === 'script';

  function decide(decision: 'approve' | 'request_changes') {
    setBusy(true);
    setError(null);
    commit(() =>
      repo.decideDeliverable(String(deliverableId), {
        decision,
        comment: note,
      }),
    )
      .then(() => setNote(''))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'That decision did not save.');
      })
      .finally(() => setBusy(false));
  }

  return (
    <Screen
      footer={
        deliverable?.canDecide ? (
          <View style={{ gap: 8 }}>
            {error ? <Body>{error}</Body> : null}
            <DecisionBar
              status={deliverable.status}
              note={note}
              busy={busy}
              onChangeNote={setNote}
              onApprove={() => decide('approve')}
              onRequestChanges={() => decide('request_changes')}
            />
          </View>
        ) : undefined
      }
    >
      <QueryState query={query} loading="Opening the deliverable">
        {(item) => (
          <>
            <StackHeader title={item.title} subtitle={`${item.clientName} · ${item.projectName}`} />
            <View
              style={{
                height: tall ? 360 : 220,
                borderRadius: 22,
                overflow: 'hidden',
                backgroundColor: colors.surface2,
              }}
              accessibilityLabel={`${item.title} preview`}
            >
              <DeliverablePreview previewKey={item.previewKey} brandColor={item.brandColor} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusPill status={item.status} />
              <Text style={{ color: colors.muted, fontFamily: fontFamily?.medium }}>
                Version {item.version} · {item.fileName}
              </Text>
            </View>
            <Text style={{ color: colors.faint, fontSize: 13 }}>Updated {formatDate(item.updatedAt)}</Text>
            {item.kind === 'file' ? (
              <View style={{ gap: 6, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 16 }}>
                  {item.pageCount ? `${item.pageCount} pages` : 'File preview'}
                </Text>
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.body, fontSize: 15, lineHeight: 22 }}>
                  {item.filePreviewText ?? 'The studio has not attached a text preview for this file.'}
                </Text>
              </View>
            ) : (
              <Body>Image preview from the studio upload. Approve it, or send a note with the change.</Body>
            )}
            <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>Notes</Text>
            {item.comments.length === 0 ? <Body>No notes on this version yet.</Body> : null}
            {item.comments.map((comment) => (
              <View
                key={comment.id}
                style={{
                  gap: 4,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: comment.visibility === 'internal' ? colors.goldSoft : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold }}>
                  {comment.authorName}
                  {comment.authorTitle ? ` · ${comment.authorTitle}` : ''}
                </Text>
                {comment.visibility === 'internal' ? (
                  <Text style={{ color: colors.gold, fontFamily: fontFamily?.semibold, fontSize: 12 }}>
                    Internal — clients never see this
                  </Text>
                ) : null}
                <Text style={{ color: colors.ink, fontSize: 16, lineHeight: 22 }}>{comment.body}</Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>{formatDate(comment.createdAt)}</Text>
              </View>
            ))}
            {item.canWriteInternal ? (
              <>
                <Composer
                  label="Reply to the client"
                  action="Send reply"
                  placeholder="This is visible in their portal."
                  onSubmit={(body) =>
                    commit(() => repo.addDeliverableNote(item.id, { body, visibility: 'client' })).then(() => undefined)
                  }
                />
                <Composer
                  label="Internal note"
                  action="Save internal note"
                  placeholder="Clients never see this."
                  onSubmit={(body) =>
                    commit(() =>
                      repo.addDeliverableNote(item.id, { body, visibility: 'internal' }),
                    ).then(() => undefined)
                  }
                />
              </>
            ) : null}
          </>
        )}
      </QueryState>
    </Screen>
  );
}
