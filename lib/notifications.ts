import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getAllClubsWithSchedules, getChildren } from './repositories';

// Configure the foreground notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Secure Store Keys
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';
const CLASS_REMINDER_OFFSET_KEY = 'class_reminder_offset';
const PAYMENT_REMINDERS_ENABLED_KEY = 'payment_reminders_enabled';

export type StoredSettings = {
  notificationsEnabled: boolean;
  classReminderOffset: number; // in minutes
  paymentRemindersEnabled: boolean;
};

/**
 * Fetch notifications configuration from Secure Store
 */
export async function getStoredNotificationSettings(): Promise<StoredSettings> {
  try {
    const enabledVal = await SecureStore.getItemAsync(NOTIFICATIONS_ENABLED_KEY);
    const offsetVal = await SecureStore.getItemAsync(CLASS_REMINDER_OFFSET_KEY);
    const payVal = await SecureStore.getItemAsync(PAYMENT_REMINDERS_ENABLED_KEY);

    return {
      notificationsEnabled: enabledVal === null ? true : enabledVal === 'true',
      classReminderOffset: offsetVal === null ? 30 : parseInt(offsetVal, 10),
      paymentRemindersEnabled: payVal === null ? true : payVal === 'true',
    };
  } catch (error) {
    console.warn('Failed to load notification settings:', error);
    return {
      notificationsEnabled: true,
      classReminderOffset: 30,
      paymentRemindersEnabled: true,
    };
  }
}

/**
 * Save notification settings to Secure Store
 */
export async function setStoredNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  } catch (error) {
    console.warn('Failed to save notificationsEnabled settings:', error);
  }
}

export async function setStoredClassReminderOffset(offset: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLASS_REMINDER_OFFSET_KEY, String(offset));
  } catch (error) {
    console.warn('Failed to save classReminderOffset settings:', error);
  }
}

export async function setStoredPaymentRemindersEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(PAYMENT_REMINDERS_ENABLED_KEY, String(enabled));
  } catch (error) {
    console.warn('Failed to save paymentRemindersEnabled settings:', error);
  }
}

/**
 * Request notification permissions from the system
 */
export async function requestPermissionsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4F46E5',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Calculates correct trigger time for weekly notifications after subtracting reminder offset
 * @param dayOfWeek 1=Monday, 7=Sunday
 * @param startTime format "HH:MM"
 * @param offsetMinutes reminder offset in minutes
 */
function calculateReminderTime(dayOfWeek: number, startTime: string, offsetMinutes: number) {
  const [hourStr, minuteStr] = startTime.split(':');
  let hour = parseInt(hourStr, 10);
  let minute = parseInt(minuteStr, 10);

  // Subtract the offset minutes
  minute -= offsetMinutes;
  let dayAdjust = 0;

  while (minute < 0) {
    minute += 60;
    hour -= 1;
  }
  while (hour < 0) {
    hour += 24;
    dayAdjust -= 1;
  }

  let targetDayOfWeek = dayOfWeek + dayAdjust;
  if (targetDayOfWeek < 1) {
    targetDayOfWeek += 7;
  } else if (targetDayOfWeek > 7) {
    targetDayOfWeek -= 7;
  }

  // Expo weekly trigger weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
  const expoWeekdayMap: Record<number, number> = {
    1: 2, // Mon -> 2
    2: 3, // Tue -> 3
    3: 4, // Wed -> 4
    4: 5, // Thu -> 5
    5: 6, // Fri -> 6
    6: 7, // Sat -> 7
    7: 1, // Sun -> 1
  };

  const weekday = expoWeekdayMap[targetDayOfWeek];
  return { weekday, hour, minute };
}

/**
 * Cancels all scheduled notifications and reschedules them based on database contents
 */
export async function rescheduleAllNotifications(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // 1. Cancel all existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Load latest settings
    const settings = await getStoredNotificationSettings();
    if (!settings.notificationsEnabled) {
      console.log('Notifications are disabled globally. Cleared scheduled notifications.');
      return;
    }

    // 3. Fetch children and clubs from SQLite database
    const children = await getChildren();
    if (children.length === 0) return;

    const childMap = new Map(children.map(c => [c.id, c.name]));
    const clubs = await getAllClubsWithSchedules();

    let scheduledCount = 0;

    // 4. Schedule notifications for each club
    for (const club of clubs) {
      const childName = childMap.get(club.child_id) || 'Дитина';

      // A. Class reminders
      if (settings.classReminderOffset >= 0 && club.schedules && club.schedules.length > 0) {
        for (const slot of club.schedules) {
          const { weekday, hour, minute } = calculateReminderTime(
            slot.day_of_week,
            slot.start_time,
            settings.classReminderOffset
          );

          const bodyText = club.location
            ? `Заняття "${club.name}" о ${slot.start_time} (${club.location})`
            : `Заняття "${club.name}" о ${slot.start_time}`;

          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `${childName} — нагадування`,
                body: bodyText,
                sound: true,
                data: { type: 'class', clubId: club.id },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
            scheduledCount++;
          } catch (err) {
            console.error(`Failed to schedule class notification for club ${club.name}:`, err);
          }
        }
      }

      // B. Payment reminders
      if (settings.paymentRemindersEnabled && club.next_payment_date && club.price > 0) {
        try {
          const [year, month, day] = club.next_payment_date.split('-').map(Number);
          // Setup reminder at 9:00 AM on the payment day
          const reminderDate = new Date(year, month - 1, day, 9, 0, 0, 0);

          if (reminderDate.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `Оплата за гурток`,
                body: `Сьогодні день оплати за гурток "${club.name}" для ${childName} (${club.price} ₴)`,
                sound: true,
                data: { type: 'payment', clubId: club.id },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
              },
            });
            scheduledCount++;
          }
        } catch (err) {
          console.error(`Failed to schedule payment notification for club ${club.name}:`, err);
        }
      }
    }

    console.log(`Successfully rescheduled ${scheduledCount} notifications.`);
  } catch (error) {
    console.error('Error rescheduling notifications:', error);
  }
}

/**
 * Legacy stub - handle notification tap
 */
export function handleNotificationTap() {
  return;
}
