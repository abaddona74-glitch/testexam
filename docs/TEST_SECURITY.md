# 🔐 Test Security - Network dan o'g'irlashni qiyinlashtirish

## ❓ Muammo

Hozirda testlar Network tab (F12 → Network) da ochiq ko'rinadi:

```json
// GET /api/tests/content?id=test123
{
  "test_questions": [
    {
      "question": "2+2 = ?",
      "options": { "a": "3", "b": "4", "c": "5" },
      "correct_answer": "b"  // ❌ Bu yomon!
    }
  ]
}
```

**Muammo:** Haker F12 ochib to'g'ri javoblarni ko'radi → 100% oladi.

---

## ✅ Yechim: Server-side validation

### Asosiy g'oya

1. **Server:** To'g'ri javoblarni **hech qachon** client'ga yubormaslik
2. **Server:** Javoblarni o'zida saqlash (in-memory/Redis)
3. **Client:** Har bir javobni server'ga yuborib tekshirish
4. **Obfuscation:** Variantlarni har safar boshqacha tartibda yuborish

---

## 🔧 Qanday ishlaydi

### 1. Test ochilganda (Client → Server)

```javascript
// Client: app/page.js
const sessionId = useMemo(() => 'sess_' + Math.random().toString(36).substr(2, 9), []);

fetch(`/api/tests/content?id=test123&sessionId=${sessionId}`)
```

**Server javobi:**
```json
{
  "test": {
    "test_questions": [
      {
        "question": "2+2 = ?",
        "options": { "c": "5", "a": "3", "b": "4" },  // Shuffled!
        // ✅ correct_answer YO'Q!
      }
    ]
  },
  "meta": {
    "sessionId": "sess_abc123",
    "verificationToken": "eyJhbGc...",  // HMAC signature
    "timestamp": 1720704430022,
    "expiresAt": 1720706230022  // 30 minut
  }
}
```

**Server (internal storage):**
```javascript
// In-memory cache (production'da Redis)
global._testAnswersCache.set('sess_abc123:test123', {
  0: 'b',  // Question 0 ning to'g'ri javobi
  1: 'a',
  2: 'c',
  _timestamp: 1720704430022,
  _nonce: 'xyz789'
});
```

---

### 2. User javob beradi (Client → Server)

```javascript
// Client
await fetch('/api/tests/verify', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'sess_abc123',
    testId: 'test123',
    questionIndex: 0,
    userAnswer: 'b',
    verificationToken: 'eyJhbGc...'
  })
});
```

**Server:**
```javascript
// lib/test-security.js → verifyAnswer()
const stored = global._testAnswersCache.get('sess_abc123:test123');
const correct = stored[0]; // 'b'
const isCorrect = userAnswer === correct; // true

return { valid: true, correct: true };
// ❌ To'g'ri javobni YUBORMAYMIZ!
```

**Client oladi:**
```json
{ "correct": true }
// yoki
{ "correct": false }
```

---

### 3. Test tugadi (Client → Server)

```javascript
// Client: barcha javoblarni yuborish
const params = new URLSearchParams({
  action: 'results',
  sessionId: 'sess_abc123',
  testId: 'test123',
  verificationToken: 'eyJhbGc...',
  answers: JSON.stringify({ 0: 'b', 1: 'a', 2: 'd' })
});

fetch(`/api/tests/verify?${params}`);
```

**Server:**
```javascript
// lib/test-security.js → getTestResults()
const correctAnswers = global._testAnswersCache.get('sess_abc123:test123');

let score = 0;
Object.entries(userAnswers).forEach(([idx, userAnswer]) => {
  const correct = correctAnswers[idx];
  if (userAnswer === correct) score++;
});

// ✅ Faqat OXIRIDA to'g'ri javoblarni ko'rsatamiz (review uchun)
return {
  score: 2,
  total: 3,
  results: {
    0: { userAnswer: 'b', isCorrect: true, correctAnswer: 'b' },
    1: { userAnswer: 'a', isCorrect: true, correctAnswer: 'a' },
    2: { userAnswer: 'd', isCorrect: false, correctAnswer: 'c' }
  }
};

// Cache'ni tozalaymiz (ikkinchi marta ololmaydi)
global._testAnswersCache.delete('sess_abc123:test123');
```

---

## 🛡️ Xavfsizlik funksiyalari

### 1. HMAC Verification Token

To'g'ri javoblarni qabul qilishdan oldin token tekshiriladi:

```javascript
// lib/test-security.js
function createVerificationToken(sessionId, testId, timestamp, nonce) {
  const payload = `${sessionId}:${testId}:${timestamp}:${nonce}`;
  return createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
}
```

**Nima uchun:**
- Token'siz haker `/api/tests/verify` ga fake request yubora olmaydi
- Token faqat server secret bilan yaratiladi (client bilmaydi)

### 2. Session expiration (30 minut)

```javascript
storeCorrectAnswers(sessionId, testId, answers, timestamp);

// Auto-cleanup
setTimeout(() => {
  global._testAnswersCache.delete(key);
}, 30 * 60 * 1000);
```

### 3. Deterministic shuffle

Variantlar har safar **bir xil tartibda** shuffle bo'ladi (sessionId + questionIndex seed'i):

```javascript
function shuffleWithSeed(array, seed) {
  const rng = seedRandom(seed);
  // ...
}
```

**Nima uchun:**
- User refresh qilsa ham bir xil tartib
- Lekin har user uchun boshqacha

### 4. One-time results

Natijalarni olgandan keyin cache tozalanadi:

```javascript
deleteStoredAnswers(sessionId, testId);
```

**Nima uchun:**
- User `/api/tests/verify?action=results` ga ikkinchi marta request yubora olmaydi
- Javoblarni takror olish mumkin emas

---

## ⚠️ Muhim: 100% himoya MUMKIN EMAS!

**Nima uchun:**

1. **Client decrypt qilishi kerak** → JavaScript kodini ko'rishi mumkin
2. **Browser automation** → Puppeteer/Selenium ishlatib testni "hal qilish" mumkin
3. **Screen capture** → User ekranni capture qilib AI'ga yuborishi mumkin

**Bu yechim nima qiladi:**

✅ **Oddiy copy-paste**ni to'xtatadi  
✅ **F12 Network tab**da to'g'ri javoblar ko'rinmaydi  
✅ **Postman/cURL** bilan fake request yubora olmaydi  
✅ **Token'siz** javob ololmaydi  

❌ **Browser automation**dan himoya qilmaydi (alohida yechim kerak)  
❌ **Screen capture + AI**dan himoya qilmaydi (mumkin emas)

---

## 📊 Performance impact

### Memory usage (in-memory cache)

```
1 test session = ~2KB (100 savollik test)
1000 active users = ~2MB
10000 active users = ~20MB
```

**Yaxshilash (production):**
- Redis ishlatish (distributed cache)
- TTL automatic cleanup
- Memory limit monitoring

### Network overhead

**Oldin:**
```
GET /api/tests/content → 150KB (100 savollik test)
```

**Hozir:**
```
GET /api/tests/content → 120KB (correct_answer yo'q)
POST /api/tests/verify × 100 → 1KB × 100 = 100KB
GET /api/tests/verify?action=results → 30KB
---
Total: 250KB (+66% overhead)
```

**Tradeoff:** Xavfsizlik > Traffic  
**Optimization:** Real-time verify'ni optional qilish (faqat oxirida tekshirish)

---

## 🚀 Qanday ishga tushirish

### 1. `.env` faylida key yaratish

```bash
# Linux/Mac:
openssl rand -base64 32

# Windows PowerShell:
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

`.env` ga qo'shish:
```env
TEST_OBFUSCATION_KEY=your_generated_key_here
```

### 2. Frontend'ni yangilash (app/page.js)

**Oldin:**
```javascript
const response = await fetch(`/api/tests/content?id=${testId}`);
const data = await response.json();
setQuestions(data.content.test_questions);
```

**Hozir:**
```javascript
// Session ID yaratish (faqat bir marta)
const sessionId = useMemo(() => 
  'sess_' + Math.random().toString(36).substr(2, 9), []
);

// Test olish
const response = await fetch(
  `/api/tests/content?id=${testId}&sessionId=${sessionId}`
);
const data = await response.json();

// Meta'ni saqlash (verification uchun)
setVerificationToken(data.meta.verificationToken);
setQuestions(data.content.test_questions);
```

### 3. Javob yuborish

**Real-time feedback (optional):**
```javascript
async function checkAnswer(questionIndex, userAnswer) {
  const res = await fetch('/api/tests/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      testId,
      questionIndex,
      userAnswer,
      verificationToken
    })
  });
  const data = await res.json();
  return data.correct; // true/false
}
```

**Oxirida barcha natijalarni olish:**
```javascript
async function submitTest(userAnswers) {
  const params = new URLSearchParams({
    action: 'results',
    sessionId,
    testId,
    verificationToken,
    answers: JSON.stringify(userAnswers)
  });
  
  const res = await fetch(`/api/tests/verify?${params}`);
  const data = await res.json();
  
  console.log(data.score, data.total, data.results);
}
```

---

## 🔍 Debug & Monitoring

### Server-side logs

```javascript
// lib/test-security.js da debug logging:
console.log('[TEST-SECURITY] Cache size:', global._testAnswersCache.size);
console.log('[TEST-SECURITY] Session created:', sessionId);
console.log('[TEST-SECURITY] Answer verified:', { sessionId, questionIndex, correct });
```

### Client-side validation

```javascript
// Development modeda warning
if (process.env.NODE_ENV === 'development') {
  console.warn('[DEV] Verification token:', verificationToken);
  console.warn('[DEV] Session expires in:', (expiresAt - Date.now()) / 1000, 'seconds');
}
```

### Activity logging

Barcha suspicious activity `lib/activity-logger.js` ga yoziladi:

```javascript
// app/api/tests/verify/route.js
logActivity({
  type: 'verify_answer_failed',
  isSuspicious: true,
  suspiciousReason: 'Invalid verification token',
  details: { sessionId, testId }
});
```

---

## 📝 TODO: Frontend Integration

Hozir backend tayyor, lekin frontend'da quyidagilarni qilish kerak:

### 1. `app/page.js` da session management

```javascript
// State qo'shish
const [verificationToken, setVerificationToken] = useState(null);
const [testMeta, setTestMeta] = useState(null);

// Test yuklashda
const loadTest = async () => {
  const res = await fetch(
    `/api/tests/content?id=${testId}&sessionId=${sessionId}`
  );
  const data = await res.json();
  
  setVerificationToken(data.meta.verificationToken);
  setTestMeta(data.meta);
  // ...
};
```

### 2. Test tugashida natijalarni olish

```javascript
const handleTestComplete = async () => {
  const params = new URLSearchParams({
    action: 'results',
    sessionId,
    testId: activeTest.id,
    verificationToken,
    answers: JSON.stringify(answers)
  });
  
  const res = await fetch(`/api/tests/verify?${params}`);
  const results = await res.json();
  
  if (results.error) {
    alert('Session expired. Please restart the test.');
    return;
  }
  
  // Natijalarni ko'rsatish
  setScore(results.score);
  setTotal(results.total);
  setDetailedResults(results.results);
};
```

### 3. Leaderboard ga yuborish

```javascript
// Oldin:
await fetch('/api/leaderboard', {
  method: 'POST',
  body: JSON.stringify({ score, total, /* ... */ })
});

// Hozir ham o'sha-o'zi (server-side verification qo'shildi)
```

---

## 🔄 Production Deployment

### Redis migration (optional but recommended)

```javascript
// lib/test-security.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function storeCorrectAnswers(sessionId, testId, answers, timestamp) {
  const key = `test:${sessionId}:${testId}`;
  await redis.setex(key, 1800, JSON.stringify(answers)); // 30 min TTL
}

async function getStoredCorrectAnswers(sessionId, testId) {
  const key = `test:${sessionId}:${testId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}
```

**Avantajlar:**
- Distributed (multiple server instances)
- Persistent (server restart'da ham saqlanadi)
- Automatic TTL cleanup
- Memory efficient

---

## ✅ Checklist

### Backend (✅ Tayyor)
- [x] `lib/test-security.js` yaratildi
- [x] `/api/tests/content` obfuscation qo'shildi
- [x] `/api/tests/verify` route yaratildi
- [x] Activity logging qo'shildi
- [x] `.env.example` yangilandi

### Frontend (❌ Bajarish kerak)
- [ ] `sessionId` state qo'shish
- [ ] `verificationToken` state qo'shish
- [ ] Test yuklashda `sessionId` yuborish
- [ ] Test tugashida `/api/tests/verify?action=results` chaqirish
- [ ] Error handling (session expired)

### Testing
- [ ] Manual test: F12 → Network → `/api/tests/content` (correct_answer yo'q?)
- [ ] Manual test: Test yechish → natija to'g'ri?
- [ ] Manual test: Session expiration (30 min kutish)
- [ ] Load test: 100 concurrent users

### Production
- [ ] Redis setup (optional)
- [ ] Monitoring setup
- [ ] Rate limiting (prevent brute-force verification)

---

## 🎯 Xulosa

**Bu yechim:**
- ✅ F12 Network tab'da to'g'ri javoblarni berkitadi
- ✅ Token verification bilan fake request'larni bloklaydi
- ✅ Session-based authentication qo'shadi
- ✅ Production-ready (Redis bilan scale qiladi)

**Lekin esda tuting:**
- ⚠️ 100% himoya yo'q (browser automation mumkin)
- ⚠️ Performance overhead (+66% network traffic)
- ⚠️ Frontend integratsiya kerak (hozir faqat backend tayyor)

**Keyingi qadamlar:**
1. `.env` da `TEST_OBFUSCATION_KEY` yaratish
2. Frontend'ni yangilash (`app/page.js`)
3. Test qilish
4. Production'ga deploy qilish

---

Savollaringiz bo'lsa so'rang! 🚀
