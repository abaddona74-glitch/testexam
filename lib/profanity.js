// Profanity filter for chat and comments
// Supports Uzbek, Russian, and English bad words

const BAD_WORDS = [
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

// Build regex patterns from bad words (with word boundary matching)
const badWordPatterns = BAD_WORDS.map(word => {
  // Escape special regex chars
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'gi');
});

/**
 * Check if text contains profanity
 * @param {string} text 
 * @returns {{ hasProfanity: boolean, words: string[] }}
 */
export function checkProfanity(text) {
  if (!text) return { hasProfanity: false, words: [] };
  
  const lowerText = text.toLowerCase();
  const foundWords = [];
  
  for (const word of BAD_WORDS) {
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
  
  for (const pattern of badWordPatterns) {
    filtered = filtered.replace(pattern, (match) => {
      if (match.length <= 2) return '*'.repeat(match.length);
      return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    });
  }
  
  return filtered;
}

/**
 * Get list of all bad words (for admin panel management)
 */
export function getBadWords() {
  return [...BAD_WORDS];
}

export default { checkProfanity, filterProfanity, getBadWords };
