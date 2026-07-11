/**
 * Script to add ad blocker detection to app/page.js
 * Inserts imports, state, useEffect, and render guard
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports after LoadingScreen import line
const importMarker = "import LoadingScreen, { getStoredLoadingAnimation, setStoredLoadingAnimation, LOADING_ANIMATIONS } from '@/components/loading-screen';";
const importInsert = `import LoadingScreen, { getStoredLoadingAnimation, setStoredLoadingAnimation, LOADING_ANIMATIONS } from '@/components/loading-screen';
import AdBlockerBlocker from '@/components/adblocker-blocker';
import { detectAdBlocker } from '@/lib/detect-extensions';`;

if (!content.includes('AdBlockerBlocker')) {
  content = content.replace(importMarker, importInsert);
  console.log('✅ Added imports');
} else {
  console.log('⏭️ Imports already exist');
}

// 2. Add state declarations before loadingAnimation
const stateMarker = "const [loadingAnimation, setLoadingAnimation] = useState(null);";
const stateInsert = `    const [adBlockerDetected, setAdBlockerDetected] = useState(false);
    const [extensionCheckDone, setExtensionCheckDone] = useState(false);
    const [loadingAnimation, setLoadingAnimation] = useState(null);`;

if (!content.includes('adBlockerDetected')) {
  content = content.replace(stateMarker, stateInsert);
  console.log('✅ Added state declarations');
} else {
  console.log('⏭️ State already exists');
}

// 3. Add useEffect for ad blocker detection after the loadingAnimation hydration useEffect
const hydrationEnd = `    }, []);

    const [showTranslation, setShowTranslation] = useState(() => {`;
const detectionEffect = `    }, []);

    // ═══ Ad Blocker Detection ═══
    // Component mount bo'lganda darhol adblocker mavjudligini tekshiramiz
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        let cancelled = false;
        
        const check = async () => {
            const result = await detectAdBlocker();
            if (!cancelled) {
                setAdBlockerDetected(result.detected);
                setExtensionCheckDone(true);
                
                if (result.detected) {
                    console.warn('[Security] Ad blocker detected:', result.method);
                }
            }
        };
        
        check();
        
        return () => { cancelled = true; };
    }, []);

    const [showTranslation, setShowTranslation] = useState(() => {`;

if (!content.includes('Ad Blocker Detection')) {
  content = content.replace(hydrationEnd, detectionEffect);
  console.log('✅ Added detection useEffect');
} else {
  console.log('⏭️ Detection useEffect already exists');
}

// 4. Add ad blocker render guard before the loading screen render
const renderMarker = `    if (loading && view === 'list') {
        return (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                                <LoadingScreen animationId={loadingAnimation} />
                            </div>
        );
    }

    if (!isNameSet) {`;

const renderGuard = `    // ═══ Ad Blocker / Extension Check ═══
    // Agar adblocker aniqlandi — sahifa butunlay bloklanadi
    if (adBlockerDetected) {
        return <AdBlockerBlocker />;
    }

    if (loading && view === 'list') {
        return (
                                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                                <LoadingScreen animationId={loadingAnimation} />
                            </div>
        );
    }

    if (!isNameSet) {`;

if (!content.includes('Ad Blocker / Extension Check')) {
  content = content.replace(renderMarker, renderGuard);
  console.log('✅ Added render guard');
} else {
  console.log('⏭️ Render guard already exists');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ All changes applied to page.js');
console.log(`   File size: ${content.length} chars`);
