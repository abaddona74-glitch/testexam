// Profanity filter for chat and comments
// Supports Uzbek, Russian, and English bad words
// Smart regex: handles obfuscation (f*ck, fuuuck, f u c k, p1zda, etc.)
// Custom words can be added via admin panel (stored in global memory + DB)

const DEFAULT_BAD_WORDS = [
  // English (expanded)
  'fuck','fucking','fucked','fucker','motherfucker',
  'shit','shitty','shithead',
  'ass','asshole','asshat',
  'bitch','bitches',
  'damn','goddamn',
  'dick','dickhead',
  'pussy','pussies',
  'cock','cocksucker',
  'cunt',
  'bastard',
  'bullshit',
  'dumbass','jackass',
  'wtf','stfu','tf',
  'slut','whore',
  'retard','retarded',
  'faggot',
  'nigga','nigger',
  'penis','vagina',
  'boob','boobs','tits',
  'dildo',
  'porn','porno','xxx',
  'nude','naked',
  'blowjob','handjob',

  // Russian (expanded)
  'блять','блядь','бля',
  'сука','сучка',
  'пиздец','пизда','пиздеть','пиздатый','пиздабол',
  'хуй','хуя','хуевый','хуесос',
  'ебать','ебаный','ёбаный','ебал','ебанутый',
  'нахуй','нахуя',
  'хуйня',
  'мудак','мудила',
  'пидор','пидорас',
  'залупа',
  'дебил',
  'гандон',
  'шлюха',
  'ублюдок',
  'долбоеб','долбоёб',
  'охуеть','ахуеть',
  'нихуя',
  'похуй',
  'говно',
  'жопа',
  'срать',
  'дерьмо',
  'трахать',
  'засранец',

  // Uzbek (expanded)
  'siktir','sikdir','siktirla',
  "ko'tak",'kotak','qotoq',"qo'toq",'qotok',
  'jinda','jindan',
  'axmoq','ahmoq',
  'tentak',
  'harom','haromzoda','haromdan',
  'buzuq',
  'fohisha',
  'mammani',
  'onangni','onangdi',
  'otangni','otangdi',
  'yoqol',
  "sig'dir",
  'kalondoz',
  'shirmoy',
];

// ─── Character substitution map for obfuscation detection ───
const CHAR_SUBS = {
  'a': '[a@4аА]',
  'b': '[bбБ6]',
  'c': '[cсС¢]',
  'd': '[dдД]',
  'e': '[e3еЕёЁ€]',
  'f': '[fфФ]',
  'g': '[gгГ9]',
  'h': '[hхХ]',
  'i': '[i1!|lіІ]',
  'j': '[jжЖ]',
  'k': '[kкК]',
  'l': '[l1!|iлЛ]',
  'm': '[mмМ]',
  'n': '[nнН]',
  'o': '[o0оОØ]',
  'p': '[pрР]',
  'q': '[qкК]',
  'r': '[rрР]',
  's': '[s$5сС]',
  't': '[t7тТ+]',
  'u': '[uуУюЮ]',
  'v': '[vвВ]',
  'w': '[wшШщЩ]',
  'x': '[xхХ×]',
  'y': '[yуУ]',
  'z': '[zзЗ]',
  // Cyrillic
  'а': '[аa@4]',
  'б': '[бb6]',
  'в': '[вvw]',
  'г': '[гg]',
  'д': '[дd]',
  'е': '[еe3ёЁ]',
  'ё': '[ёеe3]',
  'ж': '[жj]',
  'з': '[зz3]',
  'и': '[иi1u]',
  'й': '[йи]',
  'к': '[кk]',
  'л': '[лl1]',
  'м': '[мm]',
  'н': '[нn]',
  'о': '[оo0]',
  'п': '[пp]',
  'р': '[рrp]',
  'с': '[сsc$]',
  'т': '[тt7+]',
  'у': '[уuy]',
  'ф': '[фf]',
  'х': '[хxh]',
  'ц': '[ц]',
  'ч': '[ч]',
  'ш': '[шw]',
  'щ': '[щw]',
  'ъ': '[ъ]',
  'ы': '[ы]',
  'ь': '[ь]',
  'э': '[э]',
  'ю': '[юu]',
  'я': '[яr]',
  "'": "[''`ʼ']?",
};

// Separator pattern between chars: allows spaces, dots, dashes, underscores, asterisks, zero-width
const SEP = '[\\s.*_\\-~`|]*';

/**
 * Build a smart regex from a word that handles:
 * - Character substitutions (a→@, o→0, etc.)
 * - Repeated characters (fuuuck)
 * - Separators between chars (f.u.c.k, f u c k, f-uck)
 */
function buildSmartPattern(word) {
  const lower = word.toLowerCase();
  const parts = [];

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const sub = CHAR_SUBS[ch];
    if (sub) {
      // Allow the char or its substitute to repeat (e.g., fuuuck)
      if (sub.endsWith('?')) {
        // optional chars like apostrophe
        parts.push(sub);
      } else {
        parts.push(sub + '+');
      }
    } else {
      // Escape special regex chars and allow repeats
      const escaped = ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      parts.push(escaped + '+');
    }

    // Add separator between chars (not after last)
    if (i < lower.length - 1) {
      parts.push(SEP);
    }
  }

  return parts.join('');
}

// ─── Pattern Cache ──────────────
let _cachedRegex = null;
let _cachedWordCount = 0;

/**
 * Build one combined regex for all words (cached)
 */
function getFilterRegex() {
  const words = getActiveWords();
  if (_cachedRegex && _cachedWordCount === words.length) return _cachedRegex;

  // Sort by length descending so longer words match first (e.g., "motherfucker" before "fuck")
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const patterns = sorted.map(buildSmartPattern);
  _cachedRegex = new RegExp('(?:' + patterns.join('|') + ')', 'gi');
  _cachedWordCount = words.length;
  return _cachedRegex;
}

/**
 * Invalidate regex cache (call when words change)
 */
function invalidateCache() {
  _cachedRegex = null;
  _cachedWordCount = 0;
}

// ─── Dynamic Word List (in-memory + DB sync) ──────────────
if (!global._profanityList) {
  global._profanityList = {
    customWords: [],   // user-added words via admin
    loaded: false,
  };
}

/**
 * Get full active word list (defaults + custom)
 */
function getActiveWords() {
  return [...DEFAULT_BAD_WORDS, ...global._profanityList.customWords];
}

/**
 * Add a custom bad word (call from admin API)
 */
export function addCustomWord(word) {
  if (!word || typeof word !== 'string') return false;
  const w = word.trim().toLowerCase();
  if (!w) return false;
  if (global._profanityList.customWords.includes(w)) return false;
  if (DEFAULT_BAD_WORDS.includes(w)) return false;
  global._profanityList.customWords.push(w);
  invalidateCache();
  return true;
}

/**
 * Remove a custom bad word
 */
export function removeCustomWord(word) {
  const w = word.trim().toLowerCase();
  const idx = global._profanityList.customWords.indexOf(w);
  if (idx === -1) return false;
  global._profanityList.customWords.splice(idx, 1);
  invalidateCache();
  return true;
}

/**
 * Set the full custom words list (used when loading from DB)
 */
export function setCustomWords(words) {
  global._profanityList.customWords = words.map(w => w.trim().toLowerCase());
  global._profanityList.loaded = true;
  invalidateCache();
}

/**
 * Get custom words list
 */
export function getCustomWords() {
  return [...global._profanityList.customWords];
}

/**
 * Check if text contains profanity
 * @param {string} text 
 * @returns {{ hasProfanity: boolean, words: string[] }}
 */
export function checkProfanity(text) {
  if (!text) return { hasProfanity: false, words: [] };

  const regex = getFilterRegex();
  const foundWords = [];
  let match;

  // Reset lastIndex for global regex
  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    foundWords.push(match[0]);
  }

  return {
    hasProfanity: foundWords.length > 0,
    words: [...new Set(foundWords)],
  };
}

/**
 * Filter/censor profanity in text
 * Replaces entire matched text with * characters matching length
 * e.g., "fuck" -> "****", "f u c k" -> "* * * *", "бля" -> "***"
 * @param {string} text 
 * @returns {string}
 */
export function filterProfanity(text) {
  if (!text) return text;

  const regex = getFilterRegex();
  // Reset lastIndex
  regex.lastIndex = 0;
  return text.replace(regex, (match) => '*'.repeat(match.length));
}

/**
 * Get all bad words (defaults + custom) for admin panel
 */
export function getBadWords() {
  return {
    defaults: [...DEFAULT_BAD_WORDS],
    custom: getCustomWords(),
    total: DEFAULT_BAD_WORDS.length + global._profanityList.customWords.length,
  };
}

export default { checkProfanity, filterProfanity, getBadWords, addCustomWord, removeCustomWord, setCustomWords, getCustomWords };
