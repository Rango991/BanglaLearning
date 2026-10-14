/**
 * Daily practice reminders. Instead of one repeating notification, we schedule
 * the next week of reminders each time the app is used, so a reminder can skip
 * days you've already hit your goal and can teach a phrase of the day.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { allPhrases, personalisePhrase, phraseByKey, phraseKey } from './content';
import { dayKey, streak, type Progress } from './engine/progress';

const native = Capacitor.isNativePlatform();
const IDS = [1, 2, 3, 4, 5, 6, 7];

export async function askReminderPermission(): Promise<boolean> {
  if (!native) return false;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    return perm.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleReminders(p: Progress): Promise<void> {
  if (!native) return;
  try {
    await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) });
    if (!p.settings.reminder) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;

    const [hour, minute] = p.settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const doneToday = (p.days[dayKey()] ?? 0) >= p.settings.goal;
    const s = streak(p.days);
    const known = Object.keys(p.phrases).filter((k) => phraseByKey.has(k));
    const phraseFor = (i: number) =>
      known.length ? phraseByKey.get(known[(i * 7 + known.length) % known.length])!.phrase : allPhrases[i % allPhrases.length].phrase;

    const notifications = IDS.flatMap((id, d) => {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, minute);
      if (at <= now || (d === 0 && doneToday)) return [];
      const raw = phraseFor(d + now.getDate());
      const ph = personalisePhrase(raw, p.profile, phraseKey(raw));
      return [
        {
          id,
          title: d === 0 && s > 0 ? `🔥 Keep your ${s}-day streak going!` : '🐯 Time for some Bangla',
          body: `Phrase of the day: ${ph.ro} = "${ph.en}"`,
          smallIcon: 'ic_stat_kotha',
          iconColor: '#0b8a5b',
          schedule: { at, allowWhileIdle: true },
        },
      ];
    });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch {
    /* notifications unavailable: nothing to do */
  }
}
