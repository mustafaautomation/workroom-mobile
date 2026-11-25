import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { roleLabel, subscriptionLabel, formatDate } from '@/domain/format';
import { presentLocalAlert } from '@/notifications/push';
import { useWorkroomTheme } from '@/theme/ThemeProvider';
import type { ThemePreference } from '@/theme/tokens';
import { Body, Button, Card, QueryState, Screen, Title } from '@/ui/components';
import { useAsync } from '@/ui/useAsync';
import { useWorkspace } from '@/workspace/WorkspaceProvider';

const PREFERENCES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Match the device' },
  { id: 'light', label: 'Light paper' },
  { id: 'dark', label: 'Dark room' },
];

export default function MoreScreen() {
  const { actor, organization, memberships, switchOrganization, signOut, repo, revision, commit, push, refreshPush } =
    useWorkspace();
  const { colors, fontFamily, preference, setPreference } = useWorkroomTheme();
  const billing = useAsync(() => repo.getBilling(), [repo, revision, actor?.activeOrgId]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!push) {
      refreshPush().catch(() => undefined);
    }
  }, [push, refreshPush]);

  return (
    <Screen>
      <Title>More</Title>
      <Body>
        {actor ? `${actor.fullName} · ${roleLabel(actor.role)}` : ''}
        {organization ? ` at ${organization.name}` : ''}
      </Body>
      <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>Workspaces</Text>
      {memberships.map((seat) => {
        const active = seat.orgId === actor?.activeOrgId;
        return (
          <Card key={seat.orgId}>
            <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 17 }}>{seat.orgName}</Text>
            <Body>
              {roleLabel(seat.role)} · {seat.tagline}
            </Body>
            <Button
              label={active ? 'Open now' : `Switch to ${seat.orgName}`}
              variant={active ? 'secondary' : 'primary'}
              testID={`org-switch-${seat.orgId}`}
              onPress={() => {
                switchOrganization(seat.orgId)
                  .then(() => router.replace('/'))
                  .catch((reason: unknown) => {
                    setMessage(reason instanceof Error ? reason.message : 'That switch did not finish.');
                  });
              }}
            />
          </Card>
        );
      })}
      <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>Appearance</Text>
      {PREFERENCES.map((item) => (
        <Button
          key={item.id}
          label={preference === item.id ? `${item.label} · on` : item.label}
          variant={preference === item.id ? 'primary' : 'secondary'}
          onPress={() => setPreference(item.id)}
        />
      ))}
      <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>Alerts on this device</Text>
      <Body>{push?.detail ?? 'Checking notification registration.'}</Body>
      <Button
        label="Send a test alert"
        variant="secondary"
        onPress={() => {
          commit(() => repo.sendTestNotification())
            .then(async (alert) => {
              await presentLocalAlert(alert.title, alert.body);
              setMessage('The test alert is in Alerts.');
            })
            .catch((reason: unknown) => {
              setMessage(reason instanceof Error ? reason.message : 'The test alert did not send.');
            });
        }}
      />
      <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>Subscription</Text>
      <QueryState query={billing} loading="Loading the plan">
        {(plan) => (
          <Card>
            <Text style={{ color: colors.ink, fontFamily: fontFamily?.semibold, fontSize: 18 }}>
              {plan.plan} · {subscriptionLabel(plan.status)}
            </Text>
            <Body>
              {plan.seatCount} seats · renews {formatDate(plan.renewsOn)}. Stripe test price {plan.priceId}. Billing
              changes happen in the Workroom web app. This screen only reads the subscription already on the account.
            </Body>
          </Card>
        )}
      </QueryState>
      {message ? <Body>{message}</Body> : null}
      <Button
        label="Sign out"
        variant="ghost"
        testID="sign-out"
        onPress={() => {
          signOut()
            .then(() => router.replace('/'))
            .catch(() => setMessage('Sign out did not finish.'));
        }}
      />
    </Screen>
  );
}
