import { NextResponse } from 'next/server';
import { getBadWords, addCustomWord, removeCustomWord, setCustomWords, getCustomWords } from '@/lib/profanity';
import dbConnect from '@/lib/mongodb';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123';

function checkAuth(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get('secret') === ADMIN_SECRET;
}

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
 * Load custom words from DB into memory (called once on first request)
 */
async function ensureLoaded() {
  if (global._profanityList?.loaded) return;
  try {
    await dbConnect();
    const config = await ProfanityConfig.findOne({ key: 'custom_words' });
    if (config && config.words) {
      setCustomWords(config.words);
    }
  } catch (err) {
    console.error('Failed to load profanity config:', err.message);
  }
}

/**
 * Save custom words to DB
 */
async function saveToDb(words) {
  try {
    await dbConnect();
    await ProfanityConfig.findOneAndUpdate(
      { key: 'custom_words' },
      { words, updatedAt: new Date() },
      { upsert: true }
    );
  } catch (err) {
    console.error('Failed to save profanity config:', err.message);
  }
}

// GET — List all bad words
export async function GET(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureLoaded();
  return NextResponse.json(getBadWords());
}

// POST — Add a custom word or bulk add
export async function POST(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureLoaded();

  try {
    const { word, words } = await request.json();

    const added = [];

    // Single word
    if (word) {
      if (addCustomWord(word)) added.push(word.trim().toLowerCase());
    }

    // Bulk add
    if (words && Array.isArray(words)) {
      for (const w of words) {
        if (addCustomWord(w)) added.push(w.trim().toLowerCase());
      }
    }

    if (added.length === 0) {
      return NextResponse.json({ error: 'No new words added (already exist or invalid)' }, { status: 400 });
    }

    // Save to DB
    await saveToDb(getCustomWords());

    return NextResponse.json({
      success: true,
      added,
      total: getBadWords().total,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
  }
}

// DELETE — Remove a custom word
export async function DELETE(request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureLoaded();

  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word required' }, { status: 400 });
  }

  const removed = removeCustomWord(word);
  if (!removed) {
    return NextResponse.json({ error: 'Word not found in custom list' }, { status: 404 });
  }

  await saveToDb(getCustomWords());

  return NextResponse.json({
    success: true,
    removed: word,
    total: getBadWords().total,
  });
}
