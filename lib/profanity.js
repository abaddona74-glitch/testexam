// Profanity filter for chat and comments
// Supports Uzbek, Russian, and English bad words
// Custom words can be added via admin panel (stored in global memory + DB)

const DEFAULT_BAD_WORDS = [
  // English
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'dick', 'pussy', 'cock', 'cunt',
  'bastard', 'asshole', 'motherfucker', 'bullshit', 'dumbass', 'jackass',
  'wtf', 'stfu', 'lmfao', 'nigga', 'nigger', 'faggot', 'retard', 'slut', 'whore',
  'penis', 'vagina', 'boob', 'dildo', 'porn', 'xxx', 'nude', 'naked',
  
  // Russian
  'блять', 'бля', 'сука', 'пиздец', 'хуй', 'ебать', 'нахуй', 'пизда',
  'ёб', 'еб', 'ебал', 'ебаный', 'ебанутый', 'хуйня', 'мудак', 'мудила',
  'пидор', 'пидорас', 'залупа', 'дебил', 'гандон', 'шлюха', 'блядь',
  'ублюдок', 'сучка', 'долбоёб', 'долбоеб', 'ёбаный', 'пиздабол',
  'хуесос', 'пиздатый', 'охуеть', 'нихуя', 'похуй', 'ахуеть',
  'засранец', 'говно', 'жопа', 'срать', 'дерьмо', 'трахать',
  
  // Uzbek
  'sikdir', 'siktir', "ko'tak", 'kotak', "ko'tак", 'qotoq', "qo'toq",
  'jinda', 'jindan', 'axmoq', 'ahmoq', 'kalondoz', 'shirmoy',
  'mammani', 'amma', 'onangni', 'onangdi', 'otangni', 'otangdi',
  'sig\'dir', 'yoqol', 'harom', 'haromzoda', 'haromdan',
  'buzuq', 'fohisha', 'qandon', 'qotok', 'tentak',
];

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
  return true;
}

/**
 * Set the full custom words list (used when loading from DB)
 */
export function setCustomWords(words) {
  global._profanityList.customWords = words.map(w => w.trim().toLowerCase());
  global._profanityList.loaded = true;
}

/**
 * Get custom words list
 */
export function getCustomWords() {
  return [...global._profanityList.customWords];
}

// Build regex patterns dynamically
function buildPatterns(words) {
  return words.map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'gi');
  });
}

/**
 * Check if text contains profanity
 * @param {string} text 
 * @returns {{ hasProfanity: boolean, words: string[] }}
 */
export function checkProfanity(text) {
  if (!text) return { hasProfanity: false, words: [] };
  
  const lowerText = text.toLowerCase();
  const allWords = getActiveWords();
  const foundWords = [];
  
  for (const word of allWords) {
    if (lowerText.includes(word.toLowerCase())) {
      foundWords.push(word);
    }
  }
  
  return {
    hasProfanity: foundWords.length > 0,
    words: foundWords,
  };
}

/**
 * Filter/censor profanity in text, replacing middle chars with *
 * e.g., "fuck" -> "f**k"
 * @param {string} text 
 * @returns {string}
 */
export function filterProfanity(text) {
  if (!text) return text;
  
  let filtered = text;
  const patterns = buildPatterns(getActiveWords());
  
  for (const pattern of patterns) {
    filtered = filtered.replace(pattern, (match) => {
      if (match.length <= 2) return '*'.repeat(match.length);
      return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
  }
  
  return filtered;
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
