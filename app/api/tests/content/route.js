import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Test from '@/models/Test';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Test ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if it's a MongoDB ID (roughly 24 hex chars)
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
        try {
            const test = await Test.findById(id);
            if (test) {
                return NextResponse.json({ 
                    content: test.content,
                    translations: {} // DB tests currently don't support multi-lang efficiently in this schema
                });
            }
        } catch (e) {
            console.error("DB Find Error", e);
        }
    }

    // Otherwise, assume it's a file path ID
    // ID format: Category/Subject/TestName (e.g., TTPU/SE/Datamining/Exam1)
    const testsDirectory = path.join(process.cwd(), 'tests');
    
    // We need to find the json file.
    // The ID logic in the main route constructs ID from folder names + base filename.
    // It strips .json and _en/_uz suffixes.
    
    // To find the actual file, we probably need to traverse or make a smart guess.
    // Since IDs can be complex (nested folders), and we don't know the exact file name (could be _en.json, _uz.json),
    // we might need to search the specific folder.

    // ID: TTPU/SE/Subject/TestName
    // Split into parts. Last part is the "Base Name".
    const parts = id.split('/');
    const baseName = parts.pop();
    const folderPathRelative = parts.join('/');
    const folderPath = path.join(testsDirectory, folderPathRelative);

    try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        const jsonFiles = entries.filter(e => e.isFile() && e.name.endsWith('.json'));

        const variants = {};

        for (const entry of jsonFiles) {
            const filename = entry.name;
            let fileBaseName = filename.replace('.json', '');
            let lang = 'en';

            const suffixMatch = fileBaseName.match(/^(.*)_(en|uz)$/);
            if (suffixMatch) {
                fileBaseName = suffixMatch[1];
                lang = suffixMatch[2];
            } else if (fileBaseName === 'en' || fileBaseName === 'uz') {
                lang = fileBaseName;
                // If the file is literally "en.json", the baseName used in ID would be the parent folder name?
                // Re-checking route.js: 
                // "baseName = category === 'General' ? 'Test' : category;"
                // This edge case is messy. 
                // Let's rely on the fact that if ID matches, it's our target.
                
                // If baseName from ID matches fileBaseName, we are good.
            }

            // Logic from route.js to determine if this file belongs to the 'baseName' group
            // But here we have 'baseName' from ID.
            
            // Re-evaluating logic:
            // The ID in route.js is constructed as `[...folderStack, baseName].join('/')`
            // So `baseName` MUST match either:
            // 1. filename (without .json)
            // 2. filename (without _en.json / _uz.json)
            
            let match = false;
            
            if (fileBaseName === baseName) {
                match = true;
            } else {
                 // Check simplified grouping logic
                 // If ID is "Exam 1", it matches "Exam 1.json", "Exam 1_en.json", "Exam 1_uz.json"
                 if (filename === `${baseName}.json` || filename === `${baseName}_en.json` || filename === `${baseName}_uz.json`) {
                     match = true;
                     const suffix = filename.match(/_(en|uz)\.json$/);
                     if (suffix) lang = suffix[1];
                 }
            }

            if (match) {
                 const contentStr = await fs.readFile(path.join(folderPath, filename), 'utf8');
                 variants[lang] = JSON.parse(contentStr);
            }
        }

        if (Object.keys(variants).length > 0) {
            // Return content for primary language + variants
            const langs = Object.keys(variants);
            const primaryLang = langs.includes('en') ? 'en' : langs[0];
            
            return NextResponse.json({
                content: variants[primaryLang],
                translations: variants
            });
        }

    } catch (err) {
        console.error(`Error reading test file for ID ${id}:`, err);
    }
    
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
}
