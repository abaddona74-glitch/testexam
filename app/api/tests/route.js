import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// In-memory store for uploaded tests (persists only while server is running)
// For permanent storage, you'd need a database (Postgres, MongoDB, etc.) or Blob storage.
let uploadedTests = [];

export async function GET() {
  const testsDirectory = path.join(process.cwd(), 'tests');
  let defaultTests = [];
  let folders = [];

  try {
    const entries = await fs.readdir(testsDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        folders.push(entry.name);
        // Handle Subject Folder
        const subjectPath = path.join(testsDirectory, entry.name);
        try {
          const subjectFiles = await fs.readdir(subjectPath);
          const jsonFiles = subjectFiles.filter(file => file.endsWith('.json'));

          for (const filename of jsonFiles) {
            const filePath = path.join(subjectPath, filename);
            const fileContents = await fs.readFile(filePath, 'utf8');
            try {
              const json = JSON.parse(fileContents);
              defaultTests.push({
                id: `${entry.name}/${filename}`, // specialized ID
                name: filename.replace('.json', ''),
                category: entry.name,
                type: 'default',
                content: json
              });
            } catch (e) {
              console.error(`Error parsing ${entry.name}/${filename}`, e);
            }
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

  return NextResponse.json({ 
    defaultTests, 
    uploadedTests,
    folders
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, content, folder } = body;

    if (!name || !content) {
        return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    if (folder) {
        // Validation sanitize folder path to prevent traversal
        const safeFolder = path.basename(folder);
        const safeName = path.basename(name).replace(/[^a-zA-Z0-9_\-\. ]/g, '') + '.json';
        
        const testsDirectory = path.join(process.cwd(), 'tests');
        const folderPath = path.join(testsDirectory, safeFolder);
        const filePath = path.join(folderPath, safeName);

        // Ensure folder exists (it should, but just in case)
        try {
            await fs.access(folderPath);
        } catch {
             await fs.mkdir(folderPath, { recursive: true });
        }

        await fs.writeFile(filePath, JSON.stringify(content, null, 2));

        return NextResponse.json({ success: true, message: "File saved to disk" });
    } else {
        const newTest = {
            id: `uploaded-${Date.now()}`,
            name: name,
            type: 'uploaded',
            content: content
        };

        uploadedTests.push(newTest);

        return NextResponse.json({ success: true, test: newTest });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
