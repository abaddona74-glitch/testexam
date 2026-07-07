import { NextResponse } from 'next/server';
import { getBadWords, addCustomWord, removeCustomWord, setCustomWords, getCustomWords, addMutedWord, removeMutedWord, setMutedWords, getMutedWords } from '@/lib/profanity';
import dbConnect from '@/lib/mongodb';
import { requireAdminAuth } from '@/lib/admin-auth';
import { extractRequestInfo, logActivity } from '@/lib/activity-logger';

// We store custom words in a simple MongoDB collection
// Using mongoose directly for a lightweight approach
import mongoose from 'mongoose';

const ProfanityConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'custom_words', unique: true },
  words: [String],
  updatedAt: { type: Date, default: Date.now },
});

const ProfanityConfig = mongoose.models.ProfanityConfig || mongoose.model('ProfanityConfig', ProfanityConfigSchema);

/**
 * Load custom words and muted words from DB into memory
 */
async function ensureLoaded() {
  const needProfanity = !global._profanityList?.loaded;
  const needMuted = !global._mutedWordsList?.loaded;
  if (!needProfanity && !needMuted) return;

  try {
    await dbConnect();
    if (needProfanity) {
      const config = await ProfanityConfig.findOne({ key: 'custom_words' });
      if (config?.words) setCustomWords(config.words);
    }
    if (needMuted) {
      const mutedConfig = await ProfanityConfig.findOne({ key: 'muted_words' });
      if (mutedConfig?.words) setMutedWords(mutedConfig.words);
    }
  } catch (err) {
    console.error('Failed to load profanity/muted config:', err.message);
  }
}

/**
 * Save custom words to DB
 */
async function saveToDb(key, words) {
  try {
    await dbConnect();
    await ProfanityConfig.findOneAndUpdate(
      { key },
      { words, updatedAt: new Date() },
      { upsert: true }
    );
  } catch (err) {
    console.error('Failed to save config:', err.message);
  }
}

// GET — List all bad words + muted words
export async function GET(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await ensureLoaded();
  const badWords = getBadWords();
  return NextResponse.json({
    ...badWords,
    muted: getMutedWords(),
  });
}

// POST — Add a custom word or muted word or bulk add
export async function POST(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await ensureLoaded();

  try {
    const { word, words, type } = await request.json();
    const actionType = type || 'profanity'; // 'profanity' | 'muted'

    const added = [];

    if (actionType === 'muted') {
      // Muted word operations
      if (word) {
        if (addMutedWord(word)) added.push(word.trim().toLowerCase());
      }
      if (words && Array.isArray(words)) {
        for (const w of words) {
          if (addMutedWord(w)) added.push(w.trim().toLowerCase());
        }
      }
      if (added.length > 0) {
        await saveToDb('muted_words', getMutedWords());
      }
    } else {
      // Profanity word operations
      if (word) {
        if (addCustomWord(word)) added.push(word.trim().toLowerCase());
      }
      if (words && Array.isArray(words)) {
        for (const w of words) {
          if (addCustomWord(w)) added.push(w.trim().toLowerCase());
        }
      }
      if (added.length > 0) {
        await saveToDb('custom_words', getCustomWords());
      }
    }

    if (added.length === 0) {
      return NextResponse.json({ error: 'No new words added (already exist or invalid)' }, { status: 400 });
    }

    await logActivity({
      type: 'admin_action',
      ...extractRequestInfo(request),
      statusCode: 200,
      details: {
        action: actionType === 'muted' ? 'muted_add_words' : 'profanity_add_words',
        addedCount: added.length,
      },
    });

    return NextResponse.json({
      success: true,
      added,
      type: actionType,
      profanity: getBadWords().total,
      muted: getMutedWords().length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
  }
}

// DELETE — Remove a custom word or muted word
export async function DELETE(request) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  await ensureLoaded();

  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');
  const type = searchParams.get('type') || 'profanity';

  if (!word) {
    return NextResponse.json({ error: 'Word required' }, { status: 400 });
  }

  let removed = false;

  if (type === 'muted') {
    removed = removeMutedWord(word);
    if (removed) await saveToDb('muted_words', getMutedWords());
  } else {
    removed = removeCustomWord(word);
    if (removed) await saveToDb('custom_words', getCustomWords());
  }

  if (!removed) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  await logActivity({
    type: 'admin_action',
    ...extractRequestInfo(request),
    statusCode: 200,
    details: {
      action: type === 'muted' ? 'muted_remove_word' : 'profanity_remove_word',
      word,
    },
  });

  return NextResponse.json({
    success: true,
    removed: word,
    type,
    profanity: getBadWords().total,
    muted: getMutedWords().length,
  });
}
