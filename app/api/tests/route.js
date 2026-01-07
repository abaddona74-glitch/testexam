import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Test from '../../../models/Test';

// In-memory store for uploaded tests (persists only while server is running)
// For permanent storage, you'd need a database (Postgres, MongoDB, etc.) or Blob storage.
// NOW USING MONGODB
let uploadedTests = [];

export async function GET() {
  await dbConnect();

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
          const jsonFiles = subjectFiles.filter(file => file.endsWith('.json'));

          const groupedFiles = new Map();

          for (const filename of jsonFiles) {
            const filePath = path.join(subjectPath, filename);
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
                      variants: {}
                  });
              }
              groupedFiles.get(baseName).variants[lang] = json;

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
              
              defaultTests.push({
                  id: group.id,
                  name: group.name,
                  category: group.category,
                  type: group.type,
                  content: variants[primaryLang],
                  translations: variants // Pass all variants to frontend
              });
          }

        } catch (err) {
            console.error(`Error reading subject folder ${entry.name}`, err);
        }
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        // Handle Root Files
        const filePath = path.join(testsDirectory, entry.name);
        const fileContents = await fs.readFile(filePath, 'utf8');
        try {
            const json = JSON.parse(fileContents);
            defaultTests.push({
                id: entry.name,
                name: entry.name.replace('.json', ''),
                category: 'General',
                type: 'default',
                content: json
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
            type: 'uploaded', // Treated as regular tests now
            content: test.content
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
    folders: foldersArray
  });
}

export async function POST(request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { name, content, folder } = body;

    if (!name || !content) {
        return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    // Save to MongoDB
    const newTest = await Test.create({
        name,
        content,
        folder: folder || 'General'
    });

    return NextResponse.json({ success: true, test: newTest });
  } catch (error) {
    console.error("Upload error", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
