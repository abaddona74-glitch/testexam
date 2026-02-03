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
  
  // Security: Require 'secret' param to view hidden tests. 
  // Example usage: /api/tests?showHidden=true&secret=admin123
  const secret = searchParams.get('secret');
  const isAuthorized = secret === 'admin123'; // Using same weak secret as admin endpoint for consistency
  
  const showHidden = searchParams.get('showHidden') === 'true' && isAuthorized;

  const uploadMode = getTestUploadMode();

  const testsDirectory = path.join(process.cwd(), 'tests');
  let defaultTests = [];
  let folders = new Set(); 
  let universities = new Set();
  let universityStructure = {}; // { "UniName": ["Dir1", "Dir2"] }

  // 1. Load from File System (Legacy/Static Tests)
  try {
    const traverse = async (currentPath, folderStack = []) => {
      let entries = [];
      try {
          entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch (err) {
          console.error(`Error reading directory ${currentPath}`, err);
          return;
      }

      const jsonFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));
      const subDirectories = entries.filter(e => e.isDirectory());

      // --- Structure Building Logic (Empty Folders Support) ---
      if (folderStack.length === 0) {
          // We are at Root. subDirectories are Universities.
          subDirectories.forEach(dir => {
              const uniName = dir.name;
              universities.add(uniName);
              if (!universityStructure[uniName]) {
                  universityStructure[uniName] = [];
              }
          });
      } else if (folderStack.length === 1) {
          // We are inside a University. subDirectories are Directions.
          const uniName = folderStack[0];
          subDirectories.forEach(dir => {
              const dirName = dir.name;
              if (universityStructure[uniName] && !universityStructure[uniName].includes(dirName)) {
                  universityStructure[uniName].push(dirName);
              }
          });
      }
      // --------------------------------------------------------

      // 1. Process files in current directory
      if (jsonFiles.length > 0) {
          // Identify Category/Subject
          let category = 'General';
          let university = 'General';
          let direction = 'General'; // New Field

          if (folderStack.length > 0) {
              category = folderStack[folderStack.length - 1]; 
              folders.add(category);
              
              // Assume first folder in stack is University
              university = folderStack[0];
              // Ensure we add it to universities set (already done in structure logic but safety net)
              universities.add(university);
              
              // Assume second folder is Direction (Group/System/Major)
              if (folderStack.length > 1) {
                  direction = folderStack[1];
              }
          }

          const groupedFiles = new Map();

          for (const entry of jsonFiles) {
              const filename = entry.name;
              if (filename.toLowerCase().includes('hidden') && !showHidden) continue;

              const filePath = path.join(currentPath, filename);
              
              try {
                  const fileContents = await fs.readFile(filePath, 'utf8');
                  const json = JSON.parse(fileContents);

                  let baseName = filename.replace('.json', '');
                  let lang = 'en';

                  // Logic to group en/uz files
                  const suffixMatch = baseName.match(/^(.*)_(en|uz)$/);
                  if (suffixMatch) {
                      baseName = suffixMatch[1];
                      lang = suffixMatch[2];
                  } else if (baseName === 'en' || baseName === 'uz') {
                      lang = baseName;
                      // Use category (folder name) as test name if file is just en.json/uz.json
                      baseName = category === 'General' ? 'Test' : category; 
                  }

                  // ID creation: use path to avoid collisions
                  const idPath = [...folderStack, baseName].join('/');

                  if (!groupedFiles.has(baseName)) {
                      groupedFiles.set(baseName, {
                          id: idPath,
                          name: baseName,
                          category: category,
                          university: university,
                          direction: direction, // Add direction
                          type: 'default',
                          isPremium: baseName.toLowerCase().includes('premium'),
                          variants: {},
                          variantsUpdatedAt: {},
                          variantsCreatedAt: {}
                      });
                  }
                  
                  groupedFiles.get(baseName).variants[lang] = json;
                  groupedFiles.get(baseName).variantsUpdatedAt[lang] = json.updatedAt ? new Date(json.updatedAt) : null;
                  groupedFiles.get(baseName).variantsCreatedAt[lang] = json.createdAt ? new Date(json.createdAt) : null;

              } catch (e) {
                  console.error(`Error processing file ${filePath}`, e);
              }
          }

          // Push grouped files to defaultTests
           for (const group of groupedFiles.values()) {
              const variants = group.variants;
              const langs = Object.keys(variants);
              if (langs.length === 0) continue;

              const primaryLang = langs.includes('en') ? 'en' : langs[0];

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

              // Calculate question count for metadata
              let qCount = 0;
              if (variants[primaryLang] && Array.isArray(variants[primaryLang].test_questions)) {
                  qCount = variants[primaryLang].test_questions.length;
              }

              defaultTests.push({
                  id: group.id,
                  name: group.name,
                  category: group.category,
                  university: group.university,
                  direction: group.direction,
                  type: group.type,
                  isPremium: group.isPremium,
                  questionsCount: qCount, // Pass count to frontend
                  availableLanguages: langs, // Pass available languages to frontend
                  content: null, // Content moved to /api/tests/content?id=...
                  translations: null, // Content moved to /api/tests/content?id=...
                  updatedAt: groupUpdatedAt,
                  createdAt: groupCreatedAt
              });
          }
      }

      // 2. Recurse into subdirectories
      for (const dir of subDirectories) {
          await traverse(path.join(currentPath, dir.name), [...folderStack, dir.name]);
      }
    };

    await traverse(testsDirectory, []);
  } catch (error) {
    console.error("Error reading tests directory:", error);
  }

  // 2. Load from MongoDB
  try {
    const dbTests = await Test.find({});
    dbTests.forEach(test => {
        let qCount = 0;
        // Handle various legacy structures in DB
        if (test.content) {
             if (Array.isArray(test.content.test_questions)) {
                 qCount = test.content.test_questions.length;
             } else if (Array.isArray(test.content)) {
                 // Check if it's an array of questions directly or array of objects with test_questions
                 if (test.content[0]?.test_questions) {
                     qCount = test.content[0].test_questions.length;
                 } else {
                     qCount = test.content.length;
                 }
             }
        }

        defaultTests.push({
            id: test._id.toString(),
            name: test.name,
            category: test.folder || 'General',
            university: 'Uploaded', // Group Uploaded tests separately
            direction: 'General', 
            type: 'uploaded', 
            questionsCount: qCount,
            content: null, // Content moved to /api/tests/content?id=...
            updatedAt: test.updatedAt || test.createdAt
        });
        if (test.folder) folders.add(test.folder);
        universities.add('Uploaded');
    });
  } catch (e) {
      console.error("DB Fetch Error", e);
  }

  // Convert Set to Array for response
  const foldersArray = Array.from(folders);
  const universitiesArray = Array.from(universities);

  return NextResponse.json({ 
    defaultTests, 
    uploadedTests: [], // Empty as we merged everything
    folders: foldersArray,
    universities: universitiesArray,
    universityStructure, // Return the full structure
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
