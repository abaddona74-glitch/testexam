const text = "assalomu aleykum f u c k блять p1zda ass hole";
const text2 = "ass aleykum";

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

const SEP = '[\\s.*_\\-~`|]*';

function buildSmartPattern(word) {
  const lower = word.toLowerCase();
  const parts = [];

  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    const sub = CHAR_SUBS[ch];
    if (sub) {
      if (sub.endsWith('?')) {
        parts.push(sub);
      } else {
        parts.push(sub + '+');
      }
    } else {
      const escaped = ch.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
      parts.push(escaped + '+');
    }

    if (i < lower.length - 1) {
      parts.push(SEP);
    }
  }

  return parts.join('');
}

const words = ['ass', 'fuck', 'блять', 'пизда'];
const patterns = words.map(buildSmartPattern);

// Using unicode lookbehind/lookahead for letters and digits
// \\p{L} - any letter
// \\p{N} - any number
const regex = new RegExp('(?<![\\\\p{L}\\\\p{N}])(?:' + patterns.join('|') + ')(?![\\\\p{L}\\\\p{N}])', 'giu');

console.log("Original text 1:", text);
console.log("Filtered text 1:", text.replace(regex, (match) => '*'.repeat(match.length)));

console.log("Original text 2:", text2);
console.log("Filtered text 2:", text2.replace(regex, (match) => '*'.repeat(match.length)));
