/**
 * Personalisation. Role-plays and the "About you" unit contain tokens such as
 * {name} or {cityE}; at lesson time they're filled in from the learner's profile
 * (kept on the phone only), in Bengali script, romanised spelling and English.
 */
import type { Chat, ChatLine, Lesson, Phrase } from './types';

export type Gender = 'm' | 'f';
export type Married = 'single' | 'engaged' | 'married';

export interface Profile {
  name: string;
  /** Bengali-script spelling of the name, used for the voice. */
  nameBn: string;
  gender: Gender;
  age: number;
  /** A key of CITIES, or free text. */
  city: string;
  /** A key of HOMES (where the family is from in Sylhet), or free text. */
  home: string;
  /** A key of JOBS. */
  job: string;
  married: Married;
  brothers: number;
  sisters: number;
}

export const defaultProfile: Profile = {
  name: 'Sami',
  nameBn: 'সামি',
  gender: 'm',
  age: 25,
  city: 'london',
  home: 'sylhet',
  job: 'office',
  married: 'single',
  brothers: 1,
  sisters: 1,
};

interface Words {
  bn: string;
  ro: string;
  en: string;
}

interface Place extends Words {
  /** "in <place>" */
  bnE: string;
  roE: string;
}

const place = (bn: string, ro: string, bnE = bn + 'ে', roE = ro + 'e', en = ro): Place => ({ bn, ro, en, bnE, roE });

export const CITIES: Record<string, Place> = {
  london: place('লন্ডন', 'London'),
  birmingham: place('বার্মিংহাম', 'Birmingham'),
  manchester: place('ম্যানচেস্টার', 'Manchester'),
  oldham: place('ওল্ডহাম', 'Oldham'),
  bradford: place('ব্র্যাডফোর্ড', 'Bradford'),
  luton: place('লুটন', 'Luton'),
  leeds: place('লিডস', 'Leeds'),
  cardiff: place('কার্ডিফ', 'Cardiff'),
  newcastle: place('নিউক্যাসল', 'Newcastle'),
};

export const HOMES: Record<string, Place> = {
  sylhet: place('সিলেট', 'Sylhet'),
  sylhettown: place('সিলেট শহর', 'Sylhet shohor', 'সিলেট শহরে', 'Sylhet shohore', 'Sylhet town'),
  moulvibazar: place('মৌলভীবাজার', 'Moulvibazar'),
  sunamganj: place('সুনামগঞ্জ', 'Sunamganj'),
  habiganj: place('হবিগঞ্জ', 'Habiganj'),
  beanibazar: place('বিয়ানীবাজার', 'Beanibazar'),
  balaganj: place('বালাগঞ্জ', 'Balaganj'),
  biswanath: place('বিশ্বনাথ', 'Biswanath'),
  golapganj: place('গোলাপগঞ্জ', 'Golapganj'),
  jagannathpur: place('জগন্নাথপুর', 'Jagannathpur'),
  chhatak: place('ছাতক', 'Chhatak'),
};

export const JOBS: Record<string, { label: string } & Words> = {
  student: { label: 'Student', bn: 'আমি পড়াশোনা করি', ro: 'ami porashona kori', en: "I'm a student" },
  office: { label: 'Office job', bn: 'আমি একটা অফিসে কাজ করি', ro: 'ami ekta office-e kaj kori', en: 'I work in an office' },
  it: { label: 'IT / tech', bn: 'আমি আইটিতে কাজ করি', ro: 'ami IT-te kaj kori', en: 'I work in IT' },
  hospital: { label: 'NHS / healthcare', bn: 'আমি হাসপাতালে কাজ করি', ro: 'ami hashpatale kaj kori', en: 'I work in a hospital' },
  teacher: { label: 'Teacher', bn: 'আমি শিক্ষক', ro: 'ami shikkhok', en: "I'm a teacher" },
  driver: { label: 'Driver', bn: 'আমি গাড়ি চালাই', ro: 'ami gari chalai', en: "I'm a driver" },
  restaurant: { label: 'Restaurant / takeaway', bn: 'আমি রেস্টুরেন্টে কাজ করি', ro: 'ami restaurant-e kaj kori', en: 'I work in a restaurant' },
  shop: { label: 'Shop', bn: 'আমি একটা দোকানে কাজ করি', ro: 'ami ekta dokane kaj kori', en: 'I work in a shop' },
  business: { label: 'Own business', bn: 'আমার নিজের ব্যবসা আছে', ro: 'amar nijer bebsha ache', en: 'I have my own business' },
  other: { label: 'Something else', bn: 'আমি কাজ করি', ro: 'ami kaj kori', en: 'I work' },
};

const SMALL: [string, string, string][] = [
  ['শূন্য', 'shunno', 'zero'],
  ['এক', 'ek', 'one'],
  ['দুই', 'dui', 'two'],
  ['তিন', 'tin', 'three'],
  ['চার', 'char', 'four'],
  ['পাঁচ', 'panch', 'five'],
  ['ছয়', 'choy', 'six'],
];

/** Ages 16–60. Bangla numbers are irregular, so each one is listed. */
const AGES: Record<number, [string, string]> = {
  16: ['ষোলো', 'sholo'], 17: ['সতেরো', 'shotero'], 18: ['আঠারো', 'atharo'], 19: ['উনিশ', 'unish'],
  20: ['বিশ', 'bish'], 21: ['একুশ', 'ekush'], 22: ['বাইশ', 'baish'], 23: ['তেইশ', 'teish'],
  24: ['চব্বিশ', 'chobbish'], 25: ['পঁচিশ', 'ponchish'], 26: ['ছাব্বিশ', 'chabbish'], 27: ['সাতাশ', 'shatash'],
  28: ['আটাশ', 'atash'], 29: ['ঊনত্রিশ', 'unotrish'], 30: ['ত্রিশ', 'trish'], 31: ['একত্রিশ', 'ekotrish'],
  32: ['বত্রিশ', 'botrish'], 33: ['তেত্রিশ', 'tetrish'], 34: ['চৌত্রিশ', 'choutrish'], 35: ['পঁয়ত্রিশ', 'poytrish'],
  36: ['ছত্রিশ', 'chotrish'], 37: ['সাঁইত্রিশ', 'shaitrish'], 38: ['আটত্রিশ', 'attrish'], 39: ['ঊনচল্লিশ', 'unochollish'],
  40: ['চল্লিশ', 'chollish'], 41: ['একচল্লিশ', 'ekchollish'], 42: ['বিয়াল্লিশ', 'biyallish'], 43: ['তেতাল্লিশ', 'tetallish'],
  44: ['চুয়াল্লিশ', 'chuyallish'], 45: ['পঁয়তাল্লিশ', 'poytallish'], 46: ['ছেচল্লিশ', 'checholish'], 47: ['সাতচল্লিশ', 'shatchollish'],
  48: ['আটচল্লিশ', 'atchollish'], 49: ['ঊনপঞ্চাশ', 'unoponchash'], 50: ['পঞ্চাশ', 'ponchash'], 51: ['একান্ন', 'ekanno'],
  52: ['বাহান্ন', 'bahanno'], 53: ['তিপ্পান্ন', 'tippanno'], 54: ['চুয়ান্ন', 'chuyanno'], 55: ['পঞ্চান্ন', 'ponchanno'],
  56: ['ছাপ্পান্ন', 'chappanno'], 57: ['সাতান্ন', 'shatanno'], 58: ['আটান্ন', 'atanno'], 59: ['ঊনষাট', 'unoshat'], 60: ['ষাট', 'shat'],
};

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const bnNumber = (n: number) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

export function ageWords(age: number): Words {
  const w = AGES[age];
  // Outside the table, Bengali digits still read aloud correctly.
  return w ? { bn: w[0], ro: w[1], en: String(age) } : { bn: bnNumber(age), ro: String(age), en: String(age) };
}

function siblingsSentence(b: number, s: number): Words {
  const num = (n: number) => SMALL[Math.min(n, 6)];
  const en = (n: number, one: string, many: string) => `${num(n)[2]} ${n === 1 ? one : many}`;
  if (!b && !s) return { bn: 'আমার কোনো ভাইবোন নেই', ro: 'amar kono bhaibon nei', en: "I don't have any brothers or sisters" };
  if (b && !s) return { bn: `আমার ${num(b)[0]} ভাই আছে`, ro: `amar ${num(b)[1]} bhai ache`, en: `I have ${en(b, 'brother', 'brothers')}` };
  if (!b && s) return { bn: `আমার ${num(s)[0]} বোন আছে`, ro: `amar ${num(s)[1]} bon ache`, en: `I have ${en(s, 'sister', 'sisters')}` };
  return {
    bn: `আমার ${num(b)[0]} ভাই আর ${num(s)[0]} বোন আছে`,
    ro: `amar ${num(b)[1]} bhai ar ${num(s)[1]} bon ache`,
    en: `I have ${en(b, 'brother', 'brothers')} and ${en(s, 'sister', 'sisters')}`,
  };
}

// ---------- names: a simple romanised → Bengali transliterator ----------

const CONS: [string, string][] = [
  ['kh', 'খ'], ['gh', 'ঘ'], ['chh', 'ছ'], ['ch', 'চ'], ['jh', 'ঝ'], ['th', 'থ'], ['dh', 'ধ'], ['ph', 'ফ'], ['bh', 'ভ'], ['sh', 'শ'],
  ['k', 'ক'], ['q', 'ক'], ['c', 'ক'], ['g', 'গ'], ['j', 'জ'], ['z', 'জ'], ['t', 'ত'], ['d', 'দ'], ['n', 'ন'], ['p', 'প'], ['f', 'ফ'],
  ['b', 'ব'], ['v', 'ভ'], ['m', 'ম'], ['r', 'র'], ['l', 'ল'], ['s', 'স'], ['h', 'হ'], ['x', 'ক্স'],
];
// [spelling, sign after a consonant, letter at the start of a syllable]
const VOWELS: [string, string, string][] = [
  ['ee', 'ী', 'ঈ'], ['oo', 'ু', 'উ'], ['ou', 'ৌ', 'ঔ'], ['ai', 'াই', 'আই'],
  ['a', 'া', 'আ'], ['i', 'ি', 'ই'], ['u', 'ু', 'উ'], ['e', 'ে', 'এ'], ['o', 'ো', 'ও'],
];

/** Rough Bengali spelling of a romanised name, good enough for the voice to say it. */
export function nameToBengali(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const w = word.toLowerCase().replace(/[^a-z]/g, '');
      let out = '';
      let i = 0;
      let afterConsonant = false;
      while (i < w.length) {
        const v = VOWELS.find(([s]) => w.startsWith(s, i));
        if (v) {
          out += afterConsonant ? v[1] : v[2];
          i += v[0].length;
          afterConsonant = false;
          continue;
        }
        if ((w[i] === 'y' || w[i] === 'w') && i > 0) {
          // A glide between vowels: Riya → রিয়া, Siwan → সিওয়ান
          out += w[i] === 'y' ? 'য়' : 'ওয়';
          i++;
          const next = VOWELS.find(([s]) => w.startsWith(s, i));
          if (next) {
            out += next[1];
            i += next[0].length;
          }
          afterConsonant = false;
          continue;
        }
        if (w[i] === 'y' || w[i] === 'w') {
          out += w[i] === 'y' ? 'ইয়' : 'ওয়';
          i++;
          afterConsonant = true;
          continue;
        }
        const c = CONS.find(([s]) => w.startsWith(s, i));
        if (!c) {
          i++;
          continue;
        }
        // Two consonants in a row join into a cluster: Abdul → আব্দুল, Ummi → উম্মি.
        if (afterConsonant) out += '্';
        out += c[1];
        i += c[0].length;
        afterConsonant = true;
      }
      return out;
    })
    .join(' ');
}

// ---------- tokens ----------

export function tokens(p: Profile): Record<string, Words> {
  const city = CITIES[p.city] ?? place(nameToBengali(p.city), p.city);
  const home = HOMES[p.home] ?? place(nameToBengali(p.home), p.home);
  const job = JOBS[p.job] ?? JOBS.other;
  const m = p.gender === 'm';
  const marriedQ: Record<Married, Words> = {
    single: { bn: 'তোমার বিয়ে কবে?', ro: 'tomar biye kobe?', en: 'So when are YOU getting married?' },
    engaged: { bn: 'শুনলাম তোমার এনগেজমেন্ট হয়েছে? বিয়ে কবে?', ro: 'shunlam tomar engagement hoyeche? biye kobe?', en: "I hear you're engaged? When's the wedding?" },
    married: { bn: 'বিয়ের পর কেমন লাগছে?', ro: 'biyer por kemon lagche?', en: "So how's married life?" },
  };
  const marriedA: Record<Married, Words> = {
    single: { bn: 'ইনশাল্লাহ, সময় হলে!', ro: 'inshallah, shomoy hole!', en: 'Inshallah, when the time comes!' },
    engaged: { bn: 'ইনশাল্লাহ, শিগগিরই!', ro: 'inshallah, shigghiri!', en: 'Inshallah, soon!' },
    married: { bn: 'আলহামদুলিল্লাহ, খুব ভালো!', ro: 'alhamdulillah, khub bhalo!', en: 'Thank God, really good!' },
  };
  const status: Record<Married, Words> = {
    single: { bn: 'আমি এখনো বিয়ে করিনি', ro: 'ami ekhono biye korini', en: "I'm not married yet" },
    engaged: { bn: 'আমার এনগেজমেন্ট হয়েছে', ro: 'amar engagement hoyeche', en: "I'm engaged" },
    married: { bn: 'আমি বিবাহিত', ro: 'ami bibahito', en: "I'm married" },
  };
  return {
    name: { bn: p.nameBn || nameToBengali(p.name), ro: p.name, en: p.name },
    age: ageWords(p.age),
    city: city,
    cityE: { bn: city.bnE, ro: city.roE, en: city.en },
    // "of <city>": London → Londoner (লন্ডনের)
    cityEr: { bn: city.bn + 'ের', ro: city.ro + 'er', en: city.en },
    home: home,
    homeE: { bn: home.bnE, ro: home.roE, en: home.en },
    job: job,
    siblings: siblingsSentence(p.brothers, p.sisters),
    marriedQ: marriedQ[p.married],
    marriedA: marriedA[p.married],
    status: status[p.married],
    // How cousins address you.
    bhaiya: m ? { bn: 'ভাইয়া', ro: 'bhaiya', en: 'bro' } : { bn: 'আপু', ro: 'apu', en: 'sis' },
    // How elders affectionately address a young man (baba) or woman (ma).
    dear: m ? { bn: 'বাবা', ro: 'baba', en: 'dear' } : { bn: 'মা', ro: 'ma', en: 'dear' },
    // Son or daughter.
    chele: m ? { bn: 'ছেলে', ro: 'chele', en: 'son' } : { bn: 'মেয়ে', ro: 'meye', en: 'daughter' },
    cheleGirl: m ? { bn: 'ছেলে', ro: 'chele', en: 'boy' } : { bn: 'মেয়ে', ro: 'meye', en: 'girl' },
  };
}

export const TOKEN_NAMES = Object.keys(tokens(defaultProfile));

const TOKEN = /\{(\w+)\}/g;

export function hasTokens(s: string): boolean {
  return /\{\w+\}/.test(s);
}

function fill(s: string, t: Record<string, Words>, field: keyof Words): string {
  return s.replace(TOKEN, (whole, k: string) => {
    const v = t[k];
    return v ? v[field] : whole;
  });
}

/** Fills a phrase's tokens. `key` keeps its review history stable whatever the profile says. */
export function personalisePhrase<T extends Phrase>(ph: T, p: Profile | undefined, key: string): T {
  if (!hasTokens(ph.bn) && !hasTokens(ph.ro) && !hasTokens(ph.en)) return ph;
  const t = tokens(p ?? defaultProfile);
  return {
    ...ph,
    key,
    bn: fill(ph.bn, t, 'bn'),
    ro: fill(ph.ro, t, 'ro'),
    en: lowerFirst(fill(ph.en, t, 'en')),
    alt: ph.alt?.map((a) => lowerFirst(fill(a, t, 'en'))),
  };
}

/** Phrase English is stored lower-case at the start (the UI capitalises it). */
function lowerFirst(s: string): string {
  return /^I\b|^I'/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

function personaliseLine(l: ChatLine, t: Record<string, Words>): ChatLine {
  return {
    ...l,
    bn: fill(l.bn, t, 'bn'),
    ro: fill(l.ro, t, 'ro'),
    en: fill(l.en, t, 'en'),
    wrong: l.wrong?.map((w) => ({ ro: fill(w.ro, t, 'ro'), en: fill(w.en, t, 'en') })),
  };
}

export function personaliseChat(c: Chat, p: Profile | undefined): Chat {
  const t = tokens(p ?? defaultProfile);
  return { ...c, with: fill(c.with, t, 'en'), scene: fill(c.scene, t, 'en'), lines: c.lines.map((l) => personaliseLine(l, t)) };
}

export function personaliseLesson(lesson: Lesson, p: Profile | undefined, keyOf: (ph: Phrase) => string): Lesson {
  return {
    ...lesson,
    phrases: lesson.phrases.map((ph) => personalisePhrase(ph, p, keyOf(ph))),
    chat: lesson.chat && personaliseChat(lesson.chat, p),
  };
}
