const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'page.js');
let content = fs.readFileSync(filePath, 'utf8');

let modified = false;

// 1. Add import
const importOld = "import CountryFlag from '@/components/CountryFlag';\r\n\r\nimport JsonImageUploader from '@/components/JsonImageUploader';";
const importNew = "import CountryFlag from '@/components/CountryFlag';\r\nimport { detectDeviceTier, getTierLabel } from '@/lib/device-tier';\r\n\r\nimport JsonImageUploader from '@/components/JsonImageUploader';";
if (content.includes(importOld)) {
    content = content.replace(importOld, importNew);
    modified = true;
    console.log('✓ Added device-tier import');
} else {
    console.log('✗ Import line not found (trying fallback)');
    // Fallback: try with just \n
    const fallbackOld = "import CountryFlag from '@/components/CountryFlag';\n\nimport JsonImageUploader from '@/components/JsonImageUploader';";
    const fallbackNew = "import CountryFlag from '@/components/CountryFlag';\nimport { detectDeviceTier, getTierLabel } from '@/lib/device-tier';\n\nimport JsonImageUploader from '@/components/JsonImageUploader';";
    if (content.includes(fallbackOld)) {
        content = content.replace(fallbackOld, fallbackNew);
        modified = true;
        console.log('✓ Added device-tier import (fallback)');
    } else {
        console.log('✗ Import line not found in any format');
    }
}

// 2. Add deviceTierInfo state and modify performanceMode
const perfModeOld = "    const [performanceMode, setPerformanceMode] = useState(() => {\r\n        if (typeof window === 'undefined') return 'high';\r\n        try {\r\n            const stored = localStorage.getItem('examApp_performanceMode');\r\n            return stored === 'low' || stored === 'medium' || stored === 'high' ? stored : 'high';\r\n        } catch {\r\n            return 'high';\r\n        }\r\n    });";
const perfModeNew = "    const [deviceTierInfo] = useState(() => {\r\n        const result = detectDeviceTier();\r\n        if (typeof window !== 'undefined') {\r\n            localStorage.setItem('examApp_deviceTier', JSON.stringify(result));\r\n        }\r\n        return result;\r\n    });\r\n\r\n    const [performanceMode, setPerformanceMode] = useState(() => {\r\n        if (typeof window === 'undefined') return 'high';\r\n        try {\r\n            const stored = localStorage.getItem('examApp_performanceMode');\r\n            if (stored === 'low' || stored === 'medium' || stored === 'high') {\r\n                return stored;\r\n            }\r\n        } catch {}\r\n        const detected = detectDeviceTier();\r\n        return detected.tier;\r\n    });";
if (content.includes(perfModeOld)) {
    content = content.replace(perfModeOld, perfModeNew);
    modified = true;
    console.log('✓ Added deviceTierInfo state + updated performanceMode');
} else {
    console.log('✗ performanceMode not found (trying fallback)');
    const fallbackOld = "    const [performanceMode, setPerformanceMode] = useState(() => {\n        if (typeof window === 'undefined') return 'high';\n        try {\n            const stored = localStorage.getItem('examApp_performanceMode');\n            return stored === 'low' || stored === 'medium' || stored === 'high' ? stored : 'high';\n        } catch {\n            return 'high';\n        }\n    });";
    const fallbackNew = "    const [deviceTierInfo] = useState(() => {\n        const result = detectDeviceTier();\n        if (typeof window !== 'undefined') {\n            localStorage.setItem('examApp_deviceTier', JSON.stringify(result));\n        }\n        return result;\n    });\n\n    const [performanceMode, setPerformanceMode] = useState(() => {\n        if (typeof window === 'undefined') return 'high';\n        try {\n            const stored = localStorage.getItem('examApp_performanceMode');\n            if (stored === 'low' || stored === 'medium' || stored === 'high') {\n                return stored;\n            }\n        } catch {}\n        const detected = detectDeviceTier();\n        return detected.tier;\n    });";
    if (content.includes(fallbackOld)) {
        content = content.replace(fallbackOld, fallbackNew);
        modified = true;
        console.log('✓ Added deviceTierInfo (fallback)');
    }
}

// 3. Add deviceTierLabel after isLowPerformance/isMediumPerformance
const tierLabelOld = "    const isLowPerformance = performanceMode === 'low';\r\n    const isMediumPerformance = performanceMode === 'medium';\r\n    const [showDonateModal, setShowDonateModal] = useState(false);";
const tierLabelNew = "    const isLowPerformance = performanceMode === 'low';\r\n    const isMediumPerformance = performanceMode === 'medium';\r\n    const deviceTierLabel = useMemo(() => getTierLabel(deviceTierInfo.tier), [deviceTierInfo.tier]);\r\n    const [showDonateModal, setShowDonateModal] = useState(false);";
if (content.includes(tierLabelOld)) {
    content = content.replace(tierLabelOld, tierLabelNew);
    modified = true;
    console.log('✓ Added deviceTierLabel');
} else {
    const fallbackOld = "    const isLowPerformance = performanceMode === 'low';\n    const isMediumPerformance = performanceMode === 'medium';\n    const [showDonateModal, setShowDonateModal] = useState(false);";
    const fallbackNew = "    const isLowPerformance = performanceMode === 'low';\n    const isMediumPerformance = performanceMode === 'medium';\n    const deviceTierLabel = useMemo(() => getTierLabel(deviceTierInfo.tier), [deviceTierInfo.tier]);\n    const [showDonateModal, setShowDonateModal] = useState(false);";
    if (content.includes(fallbackOld)) {
        content = content.replace(fallbackOld, fallbackNew);
        modified = true;
        console.log('✓ Added deviceTierLabel (fallback)');
    } else {
        console.log('✗ deviceTierLabel target not found');
    }
}

if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ File saved successfully');
} else {
    console.log('❌ No changes made - patterns not found');
}
