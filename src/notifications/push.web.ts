export interface PushRegistration {
  token: string;
  mode: 'device' | 'simulated';
  detail: string;
}

export async function registerForPush(): Promise<PushRegistration> {
  return {
    token: 'ExponentPushToken[web-preview]',
    mode: 'simulated',
    detail: 'This browser preview keeps alerts inside Workroom. A phone build registers with Expo Notifications.',
  };
}

export async function presentLocalAlert(_title: string, _body: string): Promise<void> {
  return undefined;
}
