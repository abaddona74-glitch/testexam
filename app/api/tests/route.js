import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Test from '../../../models/Test';
import { getTestUploadMode, isTestUploadEnabled, isGodmodeUploadEnabled } from '../../../lib/featureFlags.server';

// In-memory store for uploaded tests (persists only while server is running)
// For permanent storage, you'd need a database (Postgres, MongoDB, etc.) or Blob storage.
// NOW USING MONGODB
let uploadedTests = [];

export async function GET(request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const showHidden = searchParams.get('showHidden') === 'true';

  const uploadMode = getTestUploadMode();

  const testsDirectory = path.join(process.cwd(), 'tests');
  let defaultTests = [];
  let folders = new Set(); 

  // 1. Load from File System (Legacy/Static Tests)
  try {
    const entries = await fs.readdir(testsDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
         folders.add(entry.name);
        // Handle Subject Folder
        const subjectPath = path.join(testsDirectory, entry.name);
        try {
          const subjectFiles = await fs.readdir(subjectPath);
          const jsonFiles = subjectFiles.filter(file => {
             if (!file.endsWith('.json')) return false;
             if (file.toLowerCase().includes('hidden')) return showHidden;
             return true;
          });

          const groupedFiles = new Map();

          for (const filename of jsonFiles) {
            const filePath = path.join(subjectPath, filename);
            const fileStat = await fs.stat(filePath);
            const fileUpdatedAt = fileStat?.mtime;
            const fileContents = await fs.readFile(filePath, 'utf8');
            try {
              const json = JSON.parse(fileContents);
              
              let baseName = filename.replace('.json', '');
              let lang = 'en';

              // Logic to group en/uz files
              // 1. Check for suffix _en or _uz
              const suffixMatch = baseName.match(/^(.*)_(en|uz)$/);
              if (suffixMatch) {
                  baseName = suffixMatch[1];
                  lang = suffixMatch[2];
              }
              // 2. Check if file IS en.json or uz.json
              // In this case, use folder name as the test name? 
              // unique ID logic might need care.
              else if (baseName === 'en' || baseName === 'uz') {
                  // If just en.json inside "Subject", maybe we want the test name to be "Subject"?
                  // But we might have multiple groups? 
                  // Let's assume if it is explicitly en.json, it belongs to a "Main" test of that folder.
                  // For now, let's keep it simple: if it is "en", baseName is "Main" or just use the folder name logic if needed.
                  // Actually, the user specifically mentioned "v1_en", "v1_uz".
                  // Let's stick to the user's specific request about suffixes.
                  // But I'll handle "en"/"uz" as a special case where baseName becomes the folder name for cleaner UI.
                  lang = baseName; // 'en' or 'uz'
                  baseName = entry.name; // Use folder name as the test title
              }

              if (!groupedFiles.has(baseName)) {
                  groupedFiles.set(baseName, {
                      id: `${entry.name}/${baseName}`,
                      name: baseName,
                      category: entry.name,
                      type: 'default',
                      isPremium: baseName.toLowerCase().includes('premium'),
                    variants: {},
                    variantsUpdatedAt: {},
                    variantsCreatedAt: {}
                  });
              }
              groupedFiles.get(baseName).variants[lang] = json;
                // Use updatedAt from JSON if available. Do NOT fallback to file time.
                groupedFiles.get(baseName).variantsUpdatedAt[lang] = json.updatedAt ? new Date(json.updatedAt) : null;
                groupedFiles.get(baseName).variantsCreatedAt[lang] = json.createdAt ? new Date(json.createdAt) : null;

            } catch (e) {
              console.error(`Error parsing ${entry.name}/${filename}`, e);
            }
          }

          // Convert grouped files to test objects
          for (const group of groupedFiles.values()) {
              const variants = group.variants;
              const langs = Object.keys(variants);
              // Prefer 'en', then 'uz', then whatever
              const primaryLang = langs.includes('en') ? 'en' : langs[0];

              // Compute "last updated" across all language variants
              const groupUpdatedAt = Object.values(group.variantsUpdatedAt || {})
                .filter(Boolean)
                .reduce((latest, current) => {
                  if (!latest) return current;
                  return new Date(current) > new Date(latest) ? current : latest;
                }, null);
              
             const groupCreatedAt = Object.values(group.variantsCreatedAt || {})
                .filter(Boolean)
                .reduce((earliest, current) => {
                  if (!earliest) return current;
                  return new Date(current) < new Date(earliest) ? current : earliest;
                }, null);

              defaultTests.push({
                  id: group.id,
                  name: group.name,
                  category: group.category,
                  type: group.type,
                  isPremium: group.isPremium,
                  content: variants[primaryLang],
                  translations: variants, // Pass all variants to frontend
                  updatedAt: groupUpdatedAt,
                  createdAt: groupCreatedAt
              });
          }

        } catch (err) {
            console.error(`Error reading subject folder ${entry.name}`, err);
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Handle Root Files
        const filePath = path.join(testsDirectory, entry.name);
        const fileStat = await fs.stat(filePath);
        const fileUpdatedAt = fileStat?.mtime;
        const fileContents = await fs.readFile(filePath, 'utf8');
        try {
            const json = JSON.parse(fileContents);
            defaultTests.push({
                id: entry.name,
                name: entry.name.replace('.json', ''),
                category: 'General',
                type: 'default',
                content: json,
                updatedAt: json.updatedAt ? new Date(json.updatedAt) : null,
                createdAt: json.createdAt ? new Date(json.createdAt) : null
            });
        } catch (e) {
            console.error(`Error parsing ${entry.name}`, e);
        }
      }
    }
  } catch (error) {
    console.error("Error reading tests directory:", error);
  }

  // 2. Load from MongoDB
  try {
    const dbTests = await Test.find({});
    dbTests.forEach(test => {
        defaultTests.push({
            id: test._id.toString(),
            name: test.name,
            category: test.folder || 'General',
            type: 'uploaded', 
            content: test.content,
            updatedAt: test.updatedAt || test.createdAt
        });
        if (test.folder) folders.add(test.folder);
    });
  } catch (e) {
      console.error("DB Fetch Error", e);
  }

  // Convert Set to Array for response
  const foldersArray = Array.from(folders);

  return NextResponse.json({ 
    defaultTests, 
    uploadedTests: [], // Empty as we merged everything
    folders: foldersArray,
    uploadMode,
    uploadsEnabled: isTestUploadEnabled()
  });
}

export async function POST(request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { name, content, folder, godmode } = body;

    const uploadsEnabled = isTestUploadEnabled();
    const godmodeOverrideAllowed = isGodmodeUploadEnabled();
    const godmodeOverrideRequested = godmode === true;

    if (!uploadsEnabled && !(godmodeOverrideAllowed && godmodeOverrideRequested)) {
      return NextResponse.json(
        {
          error: "Test upload is temporarily disabled.",
          uploadMode: getTestUploadMode()
        },
        { status: 503 }
      );
    }

    if (!name || !content) {
        return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    // SERVER-SIDE VALIDATION
    // 1. Check if content is an object (not array)
    if (typeof content !== 'object' || Array.isArray(content)) {
         return NextResponse.json({ error: "Content must be a JSON object, not an array." }, { status: 400 });
    }
    
    // 2. Check for test_questions array
    if (!content.test_questions || !Array.isArray(content.test_questions)) {
         return NextResponse.json({ error: "Content must contain 'test_questions' array." }, { status: 400 });
    }

    // 3. Check for empty questions
    if (content.test_questions.length === 0) {
         return NextResponse.json({ error: "'test_questions' array cannot be empty." }, { status: 400 });
    }

    // Check if test exists (Update vs Create)
    const existingTest = await Test.findOne({ name, folder: folder || 'General' });

    if (existingTest) {
        existingTest.content = content;
        existingTest.updatedAt = Date.now();
        await existingTest.save();
        return NextResponse.json({ success: true, test: existingTest, type: 'updated' });
    } else {
        // Save to MongoDB
        const newTest = await Test.create({
            name,
            content,
            folder: folder || 'General',
            updatedAt: Date.now()
        });
        return NextResponse.json({ success: true, test: newTest, type: 'created' });
    }

  } catch (error) {
    console.error("Upload error", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
