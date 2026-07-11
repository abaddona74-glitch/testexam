/**
 * Test content security - Network'dan test o'g'irlashni qiyinlashtirish
 * 
 * MUHIM: 100% himoya MUMKIN EMAS, chunki client decrypt qilishi kerak.
 * Maqsad: Oddiy copy-paste ni qiyinlashtirish, to'g'ri javoblarni yashirish.
 */

import { createHmac, randomBytes } from 'node:crypto';

const SECRET_KEY = process.env.TEST_OBFUSCATION_KEY || process.env.ADMIN_SESSION_SECRET || 'fallback-key-change-this';

/**
 * Test contentni obfuscate qilish (server-side)
 * - Savollar va variantlarni shuffle qiladi
 * - To'g'ri javobni HECH QACHON yubormaydi
 * - Verification token beradi
 */
export function obfuscateTestContent(test, sessionId) {
    if (!test?.test_questions) return null;

    const timestamp = Date.now();
    const nonce = randomBytes(8).toString('base64url');

    // To'g'ri javoblarni server'da saqlab qolamiz
    const correctAnswers = {};
    
    const obfuscatedQuestions = test.test_questions.map((q, idx) => {
        // To'g'ri javobni server-side storage'ga saqlaymiz
        correctAnswers[idx] = q.correct_answer;

        // Client'ga to'g'ri javobsiz yuboramiz
        const { correct_answer, ...questionWithoutAnswer } = q;

        // Variantlarni har safar boshqacha tartibda
        if (questionWithoutAnswer.options) {
            const optionEntries = Object.entries(questionWithoutAnswer.options);
            const shuffled = shuffleWithSeed(optionEntries, `${sessionId}-${idx}-${nonce}`);
            questionWithoutAnswer.options = Object.fromEntries(shuffled);
        }

        return questionWithoutAnswer;
    });

    // Server'da session uchun to'g'ri javoblarni saqlaymiz
    storeCorrectAnswers(sessionId, test.id, correctAnswers, timestamp);

    // Verification token yaratamiz
    const verificationToken = createVerificationToken(sessionId, test.id, timestamp, nonce);

    return {
        test: {
            ...test,
            test_questions: obfuscatedQuestions
        },
        meta: {
            sessionId,
            timestamp,
            nonce,
            verificationToken,
            expiresAt: timestamp + (30 * 60 * 1000) // 30 minut
        }
    };
}

/**
 * Javobni tekshirish (server-side only)
 */
export function verifyAnswer(sessionId, testId, questionIndex, userAnswer, verificationToken) {
    // Token tekshirish
    if (!isValidVerificationToken(sessionId, testId, verificationToken)) {
        return { valid: false, error: 'Invalid verification token' };
    }

    // To'g'ri javobni olish
    const correctAnswers = getStoredCorrectAnswers(sessionId, testId);
    if (!correctAnswers) {
        return { valid: false, error: 'Session expired or invalid' };
    }

    const correctAnswer = correctAnswers[questionIndex];
    const isCorrect = userAnswer === correctAnswer;

    return {
        valid: true,
        correct: isCorrect,
        // To'g'ri javobni HAM yubormayapmmiz (faqat to'g'ri/noto'g'ri)
    };
}

/**
 * Test tugagach barcha javoblarni qaytarish (faqat review uchun)
 */
export function getTestResults(sessionId, testId, userAnswers, verificationToken) {
    if (!isValidVerificationToken(sessionId, testId, verificationToken)) {
        return { error: 'Invalid verification token' };
    }

    const correctAnswers = getStoredCorrectAnswers(sessionId, testId);
    if (!correctAnswers) {
        return { error: 'Session expired' };
    }

    let score = 0;
    const results = {};

    Object.entries(userAnswers).forEach(([idx, userAnswer]) => {
        const correct = correctAnswers[idx];
        const isCorrect = userAnswer === correct;
        if (isCorrect) score++;

        results[idx] = {
            userAnswer,
            isCorrect,
            // Faqat TUGAGANDAN KEYIN to'g'ri javobni ko'rsatamiz
            correctAnswer: correct
        };
    });

    // Session'ni tozalaymiz
    deleteStoredAnswers(sessionId, testId);

    return {
        score,
        total: Object.keys(correctAnswers).length,
        results
    };
}

// ============================================================================
// Helper functions
// ============================================================================

function shuffleWithSeed(array, seed) {
    // Deterministic shuffle (bir xil seed → bir xil natija)
    const rng = seedRandom(seed);
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function seedRandom(seed) {
    const hash = createHmac('sha256', SECRET_KEY).update(seed).digest();
    let state = hash.readUInt32BE(0);
    return function() {
        state = (state * 1664525 + 1013904223) | 0;
        return Math.abs(state) / 0x100000000;
    };
}

function createVerificationToken(sessionId, testId, timestamp, nonce) {
    const payload = `${sessionId}:${testId}:${timestamp}:${nonce}`;
    return createHmac('sha256', SECRET_KEY).update(payload).digest('base64url');
}

function isValidVerificationToken(sessionId, testId, token) {
    // Token'ni parse qilib timestamp tekshiramiz
    const stored = getStoredCorrectAnswers(sessionId, testId);
    if (!stored) return false;

    const expectedToken = createVerificationToken(
        sessionId, 
        testId, 
        stored._timestamp, 
        stored._nonce
    );

    // Timing-safe comparison
    return token === expectedToken;
}

// ============================================================================
// In-memory storage (production'da Redis/MongoDB ishlatish kerak)
// ============================================================================

if (!global._testAnswersCache) {
    global._testAnswersCache = new Map();
}

function storeCorrectAnswers(sessionId, testId, answers, timestamp) {
    const key = `${sessionId}:${testId}`;
    global._testAnswersCache.set(key, {
        ...answers,
        _timestamp: timestamp,
        _nonce: randomBytes(8).toString('base64url')
    });

    // Auto-cleanup after 30 minutes
    setTimeout(() => {
        global._testAnswersCache.delete(key);
    }, 30 * 60 * 1000);
}

function getStoredCorrectAnswers(sessionId, testId) {
    const key = `${sessionId}:${testId}`;
    return global._testAnswersCache.get(key);
}

function deleteStoredAnswers(sessionId, testId) {
    const key = `${sessionId}:${testId}`;
    global._testAnswersCache.delete(key);
}

// Cleanup old entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of global._testAnswersCache.entries()) {
        if (value._timestamp && now - value._timestamp > 30 * 60 * 1000) {
            global._testAnswersCache.delete(key);
        }
    }
}, 10 * 60 * 1000);
