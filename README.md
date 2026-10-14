# Kotha (কথা)

A Duolingo-style Android app for learning **standard spoken Bangla** (the Bangladeshi standard you hear in Dhaka and on TV), written for British Bengalis who grew up speaking **Sylheti**.

No writing required. You listen, tap word tiles, speak and role-play. Every phrase shows how you'd probably say it in Sylheti, so you learn the swaps (f→p, s→ch, z→j, kita→ki, -mu→-bo…) rather than starting from zero.

**Install:** download [`Kotha.apk`](Kotha.apk) on your Android phone and open it. You'll need to allow "install unknown apps" for your browser or file manager.

**Get the Bangla voice (one-off):** Settings → Text-to-speech → engine *Speech Services by Google* → ⚙️ → Install voice data → **Bangla (Bangladesh)**. The app's Me tab has a test button and a shortcut.

## What's in it

- **12 units, 34 lessons, ~240 phrases, 12 role-play chats:** greetings, about me, the Sylheti→Standard sound swaps, family, numbers and haggling, food, everyday verbs, plans (future), the past, rickshaws and directions, feelings and health, and visiting relatives
- **Exercises:** intro cards with audio (🐢 slow mode), what does this mean, how do you say, listen and pick, build the sentence from tiles (Bangla and English), listen and tap what you hear, match pairs, Sylheti → Standard, speaking (Google speech recognition marks you), and chat role-plays where you pick the right reply. Wrong answers come back at the end of the lesson.
- **Motivation:** XP, daily goal, streak, combo counter, confetti, and Bangla praise from Bagha the tiger
- **Practice tab:** spaced repetition (back after 1, 3, 7, 14 and 30 days), plus listening-only, speaking-only and Sylheti-swap drills
- **Phrasebook:** every phrase, searchable in English, Bangla or Sylheti, with audio
- Optional Bengali script toggle, "can't listen / can't speak now" buttons, works offline once the voice is installed

## Developing

```bash
npm install
npm run dev        # browser preview (Chrome has Bangla TTS on most desktops)
npm test           # content and engine tests
npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)
```

Needs the Android SDK (platform 36) and JDK 21. Content lives in `src/content/units-*.ts`. Each phrase has Bengali script (used for audio), a romanised spelling (used for tiles), English, and optionally a Sylheti form and a tip.
