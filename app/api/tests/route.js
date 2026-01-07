import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

// In-memory store for uploaded tests (persists only while server is running)
// For permanent storage, you'd need a database (Postgres, MongoDB, etc.) or Blob storage.
let uploadedTests = [];

export async function GET() {
  const testsDirectory = path.join(process.cwd(), 'tests');
  let defaultTests = [];

  try {
    const filenames = await fs.readdir(testsDirectory);
    
    // Filter for json files
    const jsonFiles = filenames.filter(file => file.endsWith('.json'));

    for (const filename of jsonFiles) {
        const filePath = path.join(testsDirectory, filename);
        const fileContents = await fs.readFile(filePath, 'utf8');
        try {
            const json = JSON.parse(fileContents);
            // We use the filename as ID and Name, but users can improve this by adding metadata to JSON
            defaultTests.push({
                id: filename,
                name: filename.replace('.json', ''),
                type: 'default',
                content: json
            });
        } catch (e) {
            console.error(`Error parsing ${filename}`, e);
        }
    }
  } catch (error) {
    console.error("Error reading tests directory:", error);
    // If directory doesn't exist, we just return empty defaultTests
  }

  return NextResponse.json({ 
    defaultTests, 
    uploadedTests 
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, content } = body;

    if (!name || !content) {
        return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
    }

    const newTest = {
        id: `uploaded-${Date.now()}`,
        name: name,
        type: 'uploaded',
        content: content
    };

    uploadedTests.push(newTest);

    return NextResponse.json({ success: true, test: newTest });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
