import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PushRegistration {
  token: string;
  mode: 'device' | 'simulated';
  detail: string;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPush(): Promise<PushRegistration> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reviews', {
      name: 'Reviews',
      importance: 3,
    });
  }

  if (!Device.isDevice) {
    return {
      token: 'ExponentPushToken[simulator]',
      mode: 'simulated',
      detail: 'This simulator stores alerts in Workroom. A physical device registers with Expo Notifications.',
    };
  }

  const current = await Notifications.getPermissionsAsync();
  const granted =
    current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
  if (granted.status !== 'granted') {
    return {
      token: 'ExponentPushToken[permission-denied]',
      mode: 'simulated',
      detail: 'Notifications are off for Workroom. Alerts still collect in the Alerts tab.',
    };
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return {
      token: token.data,
      mode: 'device',
      detail: 'This device is registered for review alerts.',
    };
  } catch {
    return {
      token: 'ExponentPushToken[local]',
      mode: 'simulated',
      detail: 'Expo could not issue a push token here. Alerts still collect in the app.',
    };
  }
}

export async function presentLocalAlert(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  } catch {
    // The in-app alerts list is the source of truth when the OS bridge is unavailable.
  }
}
