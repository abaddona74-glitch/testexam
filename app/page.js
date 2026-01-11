'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Play, CheckCircle2, XCircle, RefreshCcw, User, Save, List, Trophy, AlertTriangle, Settings, Crown, Gem, Shield, Swords, Flag, MessageSquare, ArrowLeft, Clock, Folder, Smartphone, Monitor, Eye, EyeOff, X, Heart, CreditCard, Calendar, Lightbulb, Ghost, Skull, Zap, ChevronUp, ChevronDown, Star, Moon, Sun, ChevronRight, ChevronLeft, Gift } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '@/components/theme-toggle';
import confetti from 'canvas-confetti';

const DIFFICULTIES = [
    { id: 'easy', name: 'Easy', hints: 3, icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-100', border: 'border-green-200', timeLimit: null },
    { id: 'middle', name: 'Middle', hints: 1, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-200', timeLimit: null },
    { id: 'hard', name: 'Hard', hints: 0, icon: Swords, color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200', timeLimit: 30 },
    { id: 'insane', name: 'Insane', hints: 0, icon: Skull, color: 'text-red-500', bg: 'bg-red-100', border: 'border-red-200', timeLimit: 20 },
    { id: 'impossible', name: 'Impossible', hints: 0, icon: Ghost, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200', timeLimit: 8 }
];

function getLeague(score, total, difficulty, duration = 0, questions = [], answers = {}) {
    const percentage = (score / total) * 100;

    // Mythic: Impossible Mode + 30 Consecutive Correct Answers
    // User requirement: "30 questions consecutive stack"
    let maxStreak = 0;
    if (difficulty === 'impossible') {
        // Fallback: If score is 100% and total questions >= 30, streak is satisfied regardless of answers data availability
        if (percentage === 100 && total >= 30) {
            maxStreak = total;
        } else if (questions && questions.length > 0 && answers) {
            let currentStreak = 0;
            questions.forEach((q, idx) => {
                if (answers[idx] === q.correct_answer) {
                    currentStreak++;
                    if (currentStreak > maxStreak) maxStreak = currentStreak;
                } else {
                    currentStreak = 0;
                }
            });
        }
    }

    if (difficulty === 'impossible' && maxStreak >= 30) {
        return {
            name: 'Mythic',
            badgeClass: 'bg-gray-900/5 text-transparent bg-clip-text bg-gradient-to-r from-red-800 via-red-600 to-red-800 border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.6)] font-extrabold',
            textClass: 'font-extrabold mythic-blood',
            rowClass: 'bg-gradient-to-r from-red-100/30 via-red-50/20 to-red-100/30 border-l-4 border-l-[#ff0000]',
            icon: Trophy
        };
    }

    // Legendary: Insane Mode + 100% Score
    if (difficulty === 'insane' && percentage === 100) {
        return {
            name: 'Legendary',
            badgeClass: 'legendary-border-tail border-transparent legendary-rgb-text font-bold',
            textClass: 'font-bold legendary-rgb-text drop-shadow-[0_1px_1px_rgba(251,191,36,0.3)]',
            rowClass: 'bg-gradient-to-r from-amber-50/50 to-transparent border-l-4 border-l-amber-400',
            icon: Crown
        };
    }

    // Hard Mode max cap: Epic (Or simply apply percentage rules below, but block Legendary/Mythic)
    // Actually, normal percentage rules apply, but we just ensured Legendary/Mythic are harder to get.
    // However, if someone gets 100% in Hard mode, they shouldn't get Legendary. They get Epic or Diamond?
    // User requested: "hard mode niki 30sek vaqti unda legendary dan pastlarni ochsa boladi (epic ruby shunga oxwawlarni)"
    // So 100% in Hard -> Epic.

    if (percentage >= 85) return {
        name: 'Epic',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
        textClass: 'font-semibold text-purple-700',
        rowClass: 'hover:bg-purple-50/30 border-l-4 border-l-transparent hover:border-l-purple-300',
        icon: Swords
    };

    if (percentage >= 70) return {
        name: 'Diamond',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        textClass: 'font-medium text-cyan-700',
        rowClass: 'hover:bg-cyan-50/30 transition-colors',
        icon: Gem
    };

    if (percentage >= 55) return {
        name: 'Ruby',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        textClass: 'text-rose-600',
        rowClass: 'hover:bg-rose-50/30 transition-colors',
        icon: Shield
    };

    if (percentage >= 40) return {
        name: 'Iron',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        textClass: 'text-slate-600',
        rowClass: 'hover:bg-slate-50 transition-colors',
        icon: Shield
    };

    return {
        name: 'Copper',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        textClass: 'text-orange-900',
        rowClass: 'hover:bg-orange-50 transition-colors',
        icon: Shield
    };
}

// Helper for Duration Formatting
function formatDuration(ms) {
    if (!ms) return "-";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
}

// Helper for relative time (simple version)
function timeAgo(dateString) {
    if (!dateString) return "-";
    const diff = (new Date() - new Date(dateString)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Separate component or reused part for detailed review
function DetailedReview({ questions, answers }) {
    const [reportReason, setReportReason] = useState("");
    const [activeReportQuestion, setActiveReportQuestion] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden">
            <div className="p-0">
                <div className="bg-gray-50 dark:bg-gray-950 px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Detailed Review</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {questions.map((q, idx) => {
                        const userAnswer = answers[idx];
                        const isCorrect = userAnswer === q.correct_answer;
                        const userOption = q.shuffledOptions.find(o => o.id === userAnswer);
                        const correctOption = q.shuffledOptions.find(o => o.id === q.correct_answer);

                        return (
                            <div key={q.id || idx} className="p-6 hover:bg-gray-50 dark:bg-gray-950 transition-colors group">
                                <div className="flex gap-4">
                                    <div className="mt-1">
                                        {isCorrect ? (
                                            <CheckCircle2 className="text-green-500" size={24} />
                                        ) : (
                                            <XCircle className="text-red-500" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-medium text-gray-900 dark:text-gray-100 pr-4">
                                                <span className="text-gray-400 mr-2">#{idx + 1}</span>
                                                {q.question}
                                            </p>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <div className={clsx("flex items-center gap-2", isCorrect ? "text-green-700" : "text-red-700")}>
                                                <span className="font-semibold w-24 flex-shrink-0">Your Answer:</span>
                                                <span>{userOption ? userOption.text : `Skipped or invalid (${userAnswer || 'None'})`}</span>
                                            </div>
                                            {!isCorrect && (
                                                <div className="flex items-center gap-2 text-green-700">
                                                    <span className="font-semibold w-24 flex-shrink-0">Correct:</span>
                                                    <span>{correctOption?.text || "Unknown"}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Device Detection
function getDeviceType() {
    if (typeof window === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'mobile';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

// Country Flag Component
function CountryFlag({ countryCode }) {
    if (!countryCode) return <span className="text-lg">🏳️</span>;
    return (
        <img
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
            alt={countryCode}
            width={24}
            height={18}
            className="inline-block shadow-sm rounded-[2px] object-cover"
        />
    );
}

function validateJson(json) {
    if (!json || typeof json !== 'object') {
        return { valid: false, error: "Invalid JSON format. Root must be an object." };
    }
    // Check for common mistake: user uploaded array directly
    if (Array.isArray(json)) {
        return { valid: false, error: "Root must be an object { test_questions: [...] }, not an array." };
    }

    if (!json.test_questions || !Array.isArray(json.test_questions)) {
        return { valid: false, error: "Root object must contain 'test_questions' array." };
    }
    if (json.test_questions.length === 0) {
        return { valid: false, error: "'test_questions' array is empty." };
    }

    // Check structure of first 3 items or all
    for (let i = 0; i < Math.min(json.test_questions.length, 5); i++) {
        const q = json.test_questions[i];
        if (!q.question) return { valid: false, error: `Question #${i + 1} is missing 'question' field.` };
        if (!q.options) return { valid: false, error: `Question #${i + 1} is missing 'options' object.` };
        if (!q.correct_answer) return { valid: false, error: `Question #${i + 1} is missing 'correct_answer' field.` };

        // Check options is object
        if (typeof q.options !== 'object' || Array.isArray(q.options)) {
            return { valid: false, error: `Question #${i + 1}: 'options' must be an object { key: "value" }.` };
        }
    }

    return { valid: true };
}

const SPINNER_ITEMS = [
    { id: 'h10', label: '+10 Hints', type: 'hint', amount: 10, color: 'bg-orange-100 text-orange-600', icon: Lightbulb, probability: 0.15 },
    { id: 'h20', label: '+20 Hints', type: 'hint', amount: 20, color: 'bg-yellow-200 text-yellow-700', icon: Lightbulb, probability: 0.05 },
    { id: 's25', label: '+25 Stars', type: 'star', amount: 25, color: 'bg-blue-100 text-blue-600', icon: Star, probability: 0.3 },
    { id: 's50', label: '+50 Stars', type: 'star', amount: 50, color: 'bg-blue-200 text-blue-700', icon: Star, probability: 0.2 },
    { id: 's100', label: '+100 Stars', type: 'star', amount: 100, color: 'bg-blue-600 text-white', icon: Star, probability: 0.05 },
    { id: 'm2x', label: '2x (1h)', type: 'multiplier', val: 2, duration: 3600000, color: 'bg-purple-100 text-purple-600', icon: Zap, probability: 0.1 },
    { id: 'm3x', label: '3x (15m)', type: 'multiplier', val: 3, duration: 900000, color: 'bg-rose-100 text-rose-600', icon: Zap, probability: 0.05 },
    { id: 's10', label: '+10 Stars', type: 'star', amount: 10, color: 'bg-gray-100 text-gray-600', icon: Star, probability: 0.1 },
];

function DailySpinner({ onClose, onReward, canSpin }) {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [prize, setPrize] = useState(null);

    const handleSpin = () => {
        if (!canSpin || spinning) return;
        setSpinning(true);

        // Determine result based on weighted probability
        const rand = Math.random();
        let cumulative = 0;
        let selectedIndex = 0;
        
        for (let i = 0; i < SPINNER_ITEMS.length; i++) {
            cumulative += SPINNER_ITEMS[i].probability;
            if (rand <= cumulative) {
                selectedIndex = i;
                break;
            }
        }

        // Calculate rotation
        // Each slice is 360 / 8 = 45deg
        // To land on index i, we need to rotate so that index i is at the top (or pointer location).
        // Let's assume pointer is at Top (0deg).
        // If 0 is at 0deg, 1 is at 45deg...
        // To bring index i to 0deg, we rotate - (i * 45).
        // Add minimal spins (5 * 360).
        // Add random jitter within the slice (+/- 20deg).
        
        const segmentAngle = 360 / SPINNER_ITEMS.length;
        const baseRotation = 360 * 8; // 8 full spins
        const targetAngle = -(selectedIndex * segmentAngle); 
        // We want the Item to be at top. 
        // Actually, usuall wheels rotate Clockwise.
        // If we want item i to be at 0deg (top), and item 0 is initially at 0deg.
        // Rotation should be: 360 - (i * segmentAngle) + baseRotation.
        
        const randomOffset = Math.floor(Math.random() * (segmentAngle - 4)) - (segmentAngle/2 - 2); // Random landing within slice
        const totalRotation = baseRotation + (360 - (selectedIndex * segmentAngle)) + randomOffset;

        setRotation(totalRotation);

        setTimeout(() => {
            setSpinning(false);
            setPrize(SPINNER_ITEMS[selectedIndex]);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999
            });
            setTimeout(() => {
                onReward(SPINNER_ITEMS[selectedIndex]);
            }, 1500);
        }, 5000); // 5s spin duration matching CSS ease-out
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative max-w-sm w-full mx-4">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                    disabled={spinning}
                >
                    <XCircle size={32} />
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl overflow-hidden relative border border-gray-100 dark:border-gray-700">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                            Daily Lucky Spin
                        </h2>
                        <p className="text-gray-500 text-sm">Spin to win guaranteed prizes!</p>
                    </div>

                    {/* Wheel Container */}
                    <div className="relative w-64 h-64 mx-auto mb-8">
                        {/* Pointer */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-20 text-red-500 filter drop-shadow-md">
                            <div className="w-8 h-8 rotate-180">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 22h20L12 2z" />
                                </svg>
                            </div>
                        </div>

                        {/* The Wheel */}
                        <div
                            className="w-full h-full rounded-full border-4 border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden relative transition-transform duration-[5000ms] ease-[cubic-bezier(0.1,0.7,0.1,1)]"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            {SPINNER_ITEMS.map((item, idx) => {
                                const angle = (360 / SPINNER_ITEMS.length) * idx;
                                return (
                                    <div
                                        key={item.id}
                                        className={clsx("absolute w-[50%] h-[50%] top-0 right-0 origin-bottom-left flex items-center justify-center pt-4 pr-4", item.id === 's100' ? "z-10" : "")}
                                        style={{
                                            transform: `rotate(${angle}deg) skewY(-45deg)`, // 45deg skew for 8 items (360/8 = 45) -> actually skew should be 90-sliceAngle? 
                                            // CSS Wheel construction usually involves specific skew logic.
                                            // Simpler approach: Place items radially without full background slices if CSS is tricky, or use a conic gradient background.
                                            // Let's use Conical Gradient for background colors and standard rotation for icons.
                                        }}
                                    >
                                        {/* Content needs to be counter-rotated or carefully placed */}
                                    </div>
                                );
                            })}
                            
                            {/* Simplified Wheel using Conic Gradient Background + Absolute Icons */}
                             <div className="absolute inset-0 rounded-full" 
                                style={{
                                    background: `conic-gradient(
                                        from -22.5deg,
                                        #fee2e2 0deg 45deg,   /* Red-100 */
                                        #fef3c7 45deg 90deg,  /* Yellow-100 */
                                        #dbeafe 90deg 135deg, /* Blue-100 */
                                        #d1fae5 135deg 180deg,/* Green-100 */
                                        #e0e7ff 180deg 225deg,/* Indigo-100 */
                                        #fae8ff 225deg 270deg,/* Fuchsia-100 */
                                        #ffe4e6 270deg 315deg,/* Rose-100 */
                                        #f3f4f6 315deg 360deg /* Gray-100 */
                                    )`
                                }}>
                            </div>

                             {/* Render Items */}
                             {SPINNER_ITEMS.map((item, idx) => {
                                 const angle = (360 / SPINNER_ITEMS.length) * idx;
                                 return (
                                     <div
                                         key={item.id}
                                         className="absolute top-0 left-1/2 w-0 h-[50%] origin-bottom flex flex-col items-center justify-start pt-3"
                                         style={{ transform: `translateX(-50%) rotate(${angle}deg)` }}
                                     >
                                         <div className="text-[10px] font-bold text-gray-600 dark:text-gray-800 text-center w-16 break-words leading-tight">
                                           {item.label}
                                         </div>
                                         <div className={`mt-1 p-1 rounded-full ${item.color.split(' ')[0]}`}>
                                            <item.icon size={14} className={item.color.split(' ')[1] || 'text-gray-700'} />
                                         </div>
                                     </div>
                                 );
                             })}
                        </div>
                         
                         {/* Center Cap */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg border-2 border-gray-100 flex items-center justify-center z-10">
                             <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>

                    <div className="text-center">
                        {!prize ? (
                            <button
                                onClick={handleSpin}
                                disabled={!canSpin || spinning}
                                className={clsx(
                                    "px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 w-full",
                                    !canSpin 
                                        ? "bg-gray-400 cursor-not-allowed" 
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25"
                                )}
                            >
                                {spinning ? 'Spinning...' : !canSpin ? 'Come back tomorrow' : 'SPIN NOW'}
                            </button>
                        ) : (
                            <div className="animate-in zoom-in duration-300">
                                <p className="text-gray-500 mb-2">You won:</p>
                                <div className={clsx("p-4 rounded-xl border-2 mb-4 flex items-center gap-3 justify-center", prize.color)}>
                                    <prize.icon size={24} />
                                    <span className="font-bold text-lg">{prize.label}</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
                                >
                                    Claim & Close
                                </button>
                            </div>
                        )}
                        {!canSpin && !prize && (
                             <p className="text-xs text-gray-400 mt-3">Next spin available at 00:00</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const { resolvedTheme } = useTheme();
    const [tests, setTests] = useState({ defaultTests: [], uploadedTests: [] });
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'test', 'upload', 'history', 'review'
    const [activeTest, setActiveTest] = useState(null);
    const [activeReview, setActiveReview] = useState(null); // For history review
    const [headerExpanded, setHeaderExpanded] = useState(true); // Navbar toggle state
    const [showDifficultyModal, setShowDifficultyModal] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [pendingTest, setPendingTest] = useState(null);

    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState(''); // Unique Session ID
    const [nameInput, setNameInput] = useState('');
    const [isNameSet, setIsNameSet] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [filterPeriod, setFilterPeriod] = useState('all'); // Filter state
    const [showSettings, setShowSettings] = useState(false);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('uzum');
    const [cardCopied, setCardCopied] = useState(false);
    const [globalActiveUsers, setGlobalActiveUsers] = useState([]);
    const [isUsersLoaded, setIsUsersLoaded] = useState(false); // New loading state
    const [userCountry, setUserCountry] = useState(null);
    const [spectatingUser, setSpectatingUser] = useState(null); // State for Spectator Mode
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    // Spinner State
    const [showSpinner, setShowSpinner] = useState(false);
    const [lastSpinDate, setLastSpinDate] = useState(null);

    // New States for Stars and Achievements
    const [userStars, setUserStars] = useState(0);
    const [unlockedLeagues, setUnlockedLeagues] = useState([]); // Array of strings: ['Legendary', 'Mythic', etc.]

    // Sync spectating user with realtime data
    useEffect(() => {
        if (spectatingUser) {
            const updatedUser = globalActiveUsers.find(u => u.userId === spectatingUser.userId);
            if (updatedUser) {
                setSpectatingUser(updatedUser);
            }
        }
    }, [globalActiveUsers]); // Update whenever global list updates

    // Upload State
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFolder, setUploadFolder] = useState('');
    const [jsonError, setJsonError] = useState(null);

    // Persistent state for resuming tests
    const [savedProgress, setSavedProgress] = useState({});

    useEffect(() => {
        // 0. Initialize User ID
        let currentUserId = localStorage.getItem('examApp_userId');
        if (!currentUserId) {
            currentUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('examApp_userId', currentUserId);
        }
        setUserId(currentUserId);

        // 1. Load persisted user name FIRST
        const storedName = localStorage.getItem('examApp_userName');
        if (storedName) {
            setUserName(storedName);
            setNameInput(storedName);
            setIsNameSet(true);
        }

        // 2. Load persisted progress
        const storedProgress = localStorage.getItem('examApp_progress');
        if (storedProgress) {
            try {
                setSavedProgress(JSON.parse(storedProgress));
            } catch (e) { console.error("Failed to parse progress", e); }
        }

        // Load Stars and Unlocks
        const storedStars = localStorage.getItem('examApp_stars');
        if (storedStars) setUserStars(parseInt(storedStars, 10));

        const storedLeagues = localStorage.getItem('examApp_unlockedLeagues');
        if (storedLeagues) {
            try {
                const parsed = JSON.parse(storedLeagues);
                if (Array.isArray(parsed)) setUnlockedLeagues(parsed);
            } catch (e) { }
        }

        // Load Last Spin
        const storedSpin = localStorage.getItem('examApp_lastSpinDate');
        if (storedSpin) setLastSpinDate(storedSpin);

        // 3. Fetch initial data
        fetchTests();
        fetchLeaderboard();
        fetchGlobalActiveUsers();

        // Warn about legendary/mythic bonuses
        if (storedLeagues) {
            try {
                const leagues = JSON.parse(storedLeagues);
                if (leagues.includes('Mythic')) {
                    // Optional: Show toast "Welcome back Mythic Player!"
                }
            } catch (e) { }
        }

        // Fetch Country (with local storage caching to avoid 429 errors)
        const storedCountry = localStorage.getItem('examApp_userCountry');
        if (storedCountry) {
            setUserCountry(storedCountry);
        } else {
            fetch('/api/country')
                .then(res => res.json())
                .then(data => {
                    if (data.country_code) {
                        setUserCountry(data.country_code);
                        localStorage.setItem('examApp_userCountry', data.country_code);
                    }
                })
                .catch(err => console.error("Country fetch failed", err));
        }

        // 4. Set up intervals
        const interval = setInterval(fetchGlobalActiveUsers, 5000);
        const leaderboardInterval = setInterval(fetchLeaderboard, 5000); // Auto-refresh leaderboard

        // 5. Send heartbeat for "Browsing" status if we have a username
        // Note: accessing userCountry here directly inside [] dependency effect won't work well 
        // because this effect runs ONCE on mount.
        // userCountry is null initially.
        // Instead of relying on closure for userCountry, we should use a ref or read from state in a separate effect that depends on userCountry.
        // However, the `heartbeatInterval` is convenient.
        // Better strategy: Let the separate effect below handle ALL heartbeats when in 'list' view.
        // And remove this one to avoid duplication?
        // The separate effect (lines ~280) handles 'list' view heartbeat.
        // This one (lines ~250) seems to be a general fallback or legacy? 
        // It runs every 10s regardless of view. If we are in 'test' view, TestRunner sends heartbeat.
        // If we are in 'list' view, the other effect sends it.
        // So this one might be redundant or causing conflict if it sends incorrect data (null country).
        // Let's REMOVE this duplicate heartbeat interval to clean up logic and rely on the reactive effect below.

        return () => {
            clearInterval(interval);
            clearInterval(leaderboardInterval);
        };
    }, []);

    const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';
    const canSpin = isDevMode || lastSpinDate !== new Date().toDateString();

    const updateUserStars = (amount) => {
        // Apply Multiplier based on Achievements
        let multiplier = 1;
        
        // check for active time multiplier
        const multEnd = parseInt(localStorage.getItem('examApp_multiplierEnd') || '0');
        if (Date.now() < multEnd) {
             const val = parseInt(localStorage.getItem('examApp_multiplierVal') || '1');
             multiplier = Math.max(multiplier, val);
        }

        if (unlockedLeagues.includes('Mythic')) multiplier = Math.max(multiplier, 3);
        else if (unlockedLeagues.includes('Legendary')) multiplier = Math.max(multiplier, 2);

        const earned = amount * multiplier;
        const newTotal = userStars + earned;

        setUserStars(newTotal);
        localStorage.setItem('examApp_stars', newTotal.toString());

        // Optional: Visual feedback could be added here
    };

    const handleSpinReward = (prize) => {
        if (prize.type === 'star') {
            // Bypass multiplier for direct wins? Or apply it? 
            // Usually spin rewards are fixed. So let's just add raw amount.
            // But updateUserStars applies multiplier. let's create a raw add function or just manually add.
            const newTotal = userStars + prize.amount;
            setUserStars(newTotal);
            localStorage.setItem('examApp_stars', newTotal.toString());
        } else if (prize.type === 'hint') {
            const currentExtra = parseInt(localStorage.getItem('examApp_extraHints') || '0', 10);
            localStorage.setItem('examApp_extraHints', (currentExtra + prize.amount).toString());
        } else if (prize.type === 'multiplier') {
            const endTime = Date.now() + prize.duration;
            localStorage.setItem('examApp_multiplierEnd', endTime.toString());
            localStorage.setItem('examApp_multiplierVal', prize.val.toString());
        }

        const today = new Date().toDateString();
        localStorage.setItem('examApp_lastSpinDate', today);
        setLastSpinDate(today);
    };

    const spendStars = (amount) => {
        if (userStars >= amount) {
            const newTotal = userStars - amount;
            setUserStars(newTotal);
            localStorage.setItem('examApp_stars', newTotal.toString());
            return true;
        }
        return false;
    };

    const updateUserUnlocks = (newLeagueName) => {
        // Only track Legendary and Mythic
        if (!['Legendary', 'Mythic'].includes(newLeagueName)) return;

        if (!unlockedLeagues.includes(newLeagueName)) {
            const newLeagues = [...unlockedLeagues, newLeagueName];
            setUnlockedLeagues(newLeagues);
            localStorage.setItem('examApp_unlockedLeagues', JSON.stringify(newLeagues));
            // Maybe show a toast/confetti here?
            alert(`Congratulations! You unlocked the ${newLeagueName} Achievement!`);
        }
    };

    // Block screenshots during test
    useEffect(() => {
        if (view !== 'test') return;

        // Create Warning Overlay
        let warningEl = document.getElementById('anti-cheat-overlay');
        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = 'anti-cheat-overlay';
            warningEl.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #000;
            color: #fff;
            display: none;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2147483647;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
        `;
            warningEl.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 10px; color: #ef4444;">Warning: Focus Lost</h1>
            <p style="font-size: 18px; color: #fff;">External resources and extensions are prohibited.</p>
        `;
            document.body.appendChild(warningEl);
        }

        const showWarning = () => {
            if (warningEl) warningEl.style.display = 'flex';
        };

        const hideWarning = () => {
            if (warningEl) warningEl.style.display = 'none';
        };

        const handleKeyDown = (e) => {
            const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
            const isSnippingTool = (e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === 's');
            const isMeta = e.key === 'Meta';

            if (isPrintScreen || isSnippingTool || isMeta) {
                if (isPrintScreen || isSnippingTool) e.preventDefault();

                showWarning();
                navigator.clipboard.writeText('').catch(() => { });

                // For PrintScreen/Snipping, keep the warning visible for 3 seconds
                if (isPrintScreen || isSnippingTool) {
                    // Clear any existing timeout to avoid premature hiding if pressed multiple times
                    if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);

                    window.screenshotTimeout = setTimeout(() => {
                        hideWarning();
                    }, 3000);
                }
            }
        };

        const handleKeyUp = (e) => {
            // Restore visibility when Meta key is released
            if (e.key === 'Meta') {
                setTimeout(hideWarning, 300);
            }
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                navigator.clipboard.writeText('').catch(() => { });
                // Re-enforce warning on keyup just in case
                showWarning();
                if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);
                window.screenshotTimeout = setTimeout(() => {
                    hideWarning();
                }, 3000);
            }
        };

        // Also hide when window loses focus (e.g. switching to Snipping Tool overlay or Mobile App Switcher)
        const handleBlur = () => {
            showWarning();
        };

        const handleFocus = () => {
            // Only hide if we aren't currently showing the screenshot warning timer
            // But for simplicity, we usually want to recover on focus
            // Unless it was a blur caused by Snipping Tool... 

            // Let's just clear clipboard and hide warning, assuming user returned to app
            navigator.clipboard.writeText('').catch(() => { });

            // Wait a tiny bit before hiding to ensure no screenshot is being finished
            setTimeout(hideWarning, 200);
        };

        // Mobile: Handle page visibility change (browsers minimize/background)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                showWarning();
            } else {
                hideWarning();
                navigator.clipboard.writeText('').catch(() => { });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (warningEl) warningEl.remove();
            if (window.screenshotTimeout) clearTimeout(window.screenshotTimeout);
        };
    }, [view]);

    // Separate effect for main page heartbeat
    useEffect(() => {
        // Send heartbeat for all views EXCEPT 'test' (because TestRunner handles 'in-test' status)
        // This ensures user stays "Online" even while in History/Upload/Review
        if (view !== 'test' && isNameSet && userName && userId) {
            const sendHeartbeat = () => {
                fetch('/api/active', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        name: userName,
                        status: 'browsing',
                        device: getDeviceType(),
                        country: userCountry,
                        stars: userStars, // Send star count
                        theme: resolvedTheme
                    })
                }).catch(e => console.error(e));
            };

            sendHeartbeat(); // Immediate
            const interval = setInterval(sendHeartbeat, 10000); // Pulse every 10s

            // Cleanup on unmount/close
            const cleanup = () => {
                fetch('/api/active?userId=' + userId, {
                    method: 'DELETE',
                    keepalive: true
                });
            };
            window.addEventListener('beforeunload', cleanup);

            return () => {
                clearInterval(interval);
                window.removeEventListener('beforeunload', cleanup);
                // Optional: cleanup(); // Don't allow cleanup on component unmount (navigating within app), only on unload/close. 
                // Actually, component unmount happens on route change too.
                // If we navigate to "Test", we want to remove "Browsing" status.
                // But "Test" component will immediately establish "Taking Test" status.
                // So updating status is better than delete.
                // Let's rely on heartbeat overwrite for status change.
                // But for closing tab, we need DELETE.
            };
        }
    }, [view, isNameSet, userName, userId, userCountry, userStars, resolvedTheme]); // Re-run when stars change too

    // Disable copy/paste/context menu and some keys when taking a test
    useEffect(() => {
        if (view === 'test') {
            const handleContextMenu = (e) => {
                e.preventDefault();
                return false;
            };

            const handleCopyPaste = (e) => {
                e.preventDefault();
                return false;
            };

            const handleKeyDown = (e) => {
                // Disable PrintScreen
                if (e.key === 'PrintScreen') {
                    navigator.clipboard.writeText('').catch(() => { }); // Clear clipboard (best effort)
                    alert('Screenshots are disabled during the test!');
                    e.preventDefault();
                }

                // Disable Ctrl+Shift+I, J, C (DevTools)
                if ((e.ctrlKey && e.shiftKey) && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    alert('Developer tools are disabled!');
                    return false;
                }

                // Disable Ctrl+Shift+S (Some screenshot tools) or Win+Shift+S attempt (OS level, hard to block but we try)
                if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    alert('Screenshots are disabled!');
                    return false;
                }

                // Disable Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+S, Ctrl+P, Ctrl+U (view source), Ctrl+A
                if (
                    (e.ctrlKey || e.metaKey) &&
                    ['c', 'v', 'x', 's', 'p', 'u', 'a'].includes(e.key.toLowerCase())
                ) {
                    e.preventDefault();
                }

                // Prevent F12
                if (e.key === 'F12') {
                    e.preventDefault();
                }
            };

            // Anti-screenshot for mobile/blur approach
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    // Determine if we should secure content (blur it)
                    const appRoot = document.getElementById('app-root') || document.body;
                    appRoot.style.filter = 'blur(20px)';
                    document.title = "⚠️ Return to test!";
                } else {
                    const appRoot = document.getElementById('app-root') || document.body;
                    appRoot.style.filter = 'none';
                    document.title = "Exam App";
                }
            };

            // Aggressive CSS injection to stop selection on mobile
            const style = document.createElement('style');
            style.innerHTML = `
            body, #root, * {
                -webkit-touch-callout: none !important;
                -webkit-user-select: none !important;
                -khtml-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            /* Hide content when printing */
            @media print {
                html, body {
                    display: none !important;
                }
            }
          `;
            document.head.appendChild(style);

            document.addEventListener('contextmenu', handleContextMenu);
            document.addEventListener('copy', handleCopyPaste);
            document.addEventListener('cut', handleCopyPaste);
            document.addEventListener('paste', handleCopyPaste);
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('selectstart', handleContextMenu); // Disable text selection
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleVisibilityChange); // Also blur on window focus loss (snipping tool activation)
            window.addEventListener('focus', handleVisibilityChange);

            return () => {
                document.removeEventListener('contextmenu', handleContextMenu);
                document.removeEventListener('copy', handleCopyPaste);
                document.removeEventListener('cut', handleCopyPaste);
                document.removeEventListener('paste', handleCopyPaste);
                document.removeEventListener('keydown', handleKeyDown);
                document.removeEventListener('selectstart', handleContextMenu);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('blur', handleVisibilityChange);
                window.removeEventListener('focus', handleVisibilityChange);

                if (document.head.contains(style)) {
                    document.head.removeChild(style);
                }
                document.body.style.filter = 'none'; // Cleanup blur
                document.title = "Exam App"; // Reset title
            };
        }
    }, [view]);

    const fetchGlobalActiveUsers = async () => {
        try {
            const res = await fetch('/api/active');
            if (res.ok) {
                const data = await res.json();
                setGlobalActiveUsers(data);
                setIsUsersLoaded(true);
            }
        } catch (e) { console.error(e); }
    };

    const fetchTests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tests');
            const data = await res.json();
            setTests(data);
            if (data.folders) setFolders(data.folders);
        } catch (error) {
            console.error("Failed to fetch tests", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`/api/leaderboard?period=${filterPeriod}`);
            if (res.ok) {
                const data = await res.json();
                setLeaderboard(data);
            }
        } catch (e) {
            console.error("Leaderboard fetch error", e);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [filterPeriod]);

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (nameInput.trim()) {
            setUserName(nameInput);
            localStorage.setItem('examApp_userName', nameInput);
            setIsNameSet(true);
            setShowSettings(false);
        }
    };

    const startTest = (test) => {
        // Check if there is a translation available (auto-detect counterpart in same folder)
        let translationContent = null;
        const isEn = test.id.endsWith('en.json');
        const isUz = test.id.endsWith('uz.json');

        if (isEn || isUz) {
            const targetId = isEn ? test.id.replace('en.json', 'uz.json') : test.id.replace('uz.json', 'en.json');
            // Search in all available tests
            const allTests = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])];
            const translation = allTests.find(t => t.id === targetId);
            if (translation) translationContent = translation.content;
        }

        // Check if we have saved progress for this test
        if (savedProgress[test.id]) {
            setActiveTest({
                ...test,
                ...savedProgress[test.id],
                translationContent, // Add translation content to resumable state
                isResumed: true
            });
            setView('test');
            return;
        }

        // Open Difficulty Modal
        setPendingTest({ ...test, translationContent });
        setShowDifficultyModal(true);
    };

    const launchTest = (difficultyId) => {
        if (!pendingTest) return;

        // Find Difficulty Settings
        const difficulty = DIFFICULTIES.find(d => d.id === difficultyId);

        // Normalize content (Handle Array/Object mismatch from legacy/Mongo)
        let contentObj = pendingTest.content;
        if (Array.isArray(contentObj)) {
            if (contentObj[0]?.test_questions) contentObj = contentObj[0];
            else if (contentObj[0]?.question) contentObj = { test_questions: contentObj };
        }

        // New test setup
        const rawQuestions = contentObj?.test_questions || [];

        // Easy mode limit logic (User request: 20 random questions for easy mode)
        let questionsPool = shuffleArray(rawQuestions);
        if (difficultyId === 'easy' && questionsPool.length > 20) {
            questionsPool = questionsPool.slice(0, 20);
        }

        const preparedQuestions = questionsPool.map(q => {
            // Allow flexible options (object to array)
            const optionsArray = Object.entries(q.options).map(([key, value]) => ({
                id: key,
                text: value
            }));

            return {
                ...q,
                shuffledOptions: shuffleArray(optionsArray)
            };
        });

        const newTestState = {
            ...pendingTest,
            questions: preparedQuestions,
            translationContent: pendingTest.translationContent, // Retrieve translation
            currentQuestionIndex: 0,
            answers: {}, // { questionId: optionId }
            isFinished: false,
            score: 0,
            startTime: Date.now(), // Track start time

            // Difficulty Setting
            hintsLeft: difficulty ? difficulty.hints : 0,
            difficultyMode: difficultyId,
            revealedHints: {}
        };

        setActiveTest(newTestState);
        setView('test');
        setShowDifficultyModal(false);
        setPendingTest(null);
    };

    const saveCurrentProgress = (testId, progressData) => {
        setSavedProgress(prev => {
            const newState = {
                ...prev,
                [testId]: progressData
            };
            localStorage.setItem('examApp_progress', JSON.stringify(newState));
            return newState;
        });
    };

    const clearProgress = (testId) => {
        setSavedProgress(prev => {
            const newState = { ...prev };
            delete newState[testId];
            localStorage.setItem('examApp_progress', JSON.stringify(newState));
            return newState;
        });
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        const fileInput = e.target.elements.fileInput;
        const file = fileInput?.files[0];

        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target.result);

                // Validation
                const validation = validateJson(json);
                if (!validation.valid) {
                    setJsonError(validation.error);
                    return;
                }

                const name = file.name.replace('.json', '');

                const res = await fetch('/api/tests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        content: json,
                        folder: uploadFolder
                    })
                });

                if (res.ok) {
                    await fetchTests();
                    setShowUploadModal(false);
                    setUploadFolder('');
                } else {
                    const errData = await res.json();
                    setJsonError(errData.error || "Failed to upload test");
                }
            } catch (err) {
                setJsonError("Invalid JSON syntax. Please check your file format.");
            }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        // Disable right-click context menu
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        // Disable copy and paste keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v')) {
                e.preventDefault();
            }
        });

        return () => {
            document.removeEventListener('contextmenu', () => { });
            document.removeEventListener('keydown', () => { });
        };
    }, []);

    if (!isNameSet) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-950 px-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100 dark:border-gray-800/50">
                    <div className="text-center mb-6">
                        <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <User size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome!</h1>
                        <p className="text-gray-500 mt-2">Please enter your name to start.</p>
                    </div>
                    <form onSubmit={handleNameSubmit}>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900 dark:text-gray-100"
                            placeholder="Your full name"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                        >
                            Continue
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading && view === 'list') {
        return <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200">
            <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        </div>;
    }

    return (
        <main className="min-h-screen bg-emerald-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans p-4 md:p-8 pb-32">
            <div className="max-w-7xl mx-auto">
                <header className={clsx(
                    "mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 sticky top-4 z-40 transition-all duration-300 ease-in-out",
                    headerExpanded ? "p-6" : "p-0 py-2 border-transparent shadow-none bg-transparent"
                )}>
                    <div className={clsx(
                        "flex justify-between items-center transition-all duration-300 overflow-hidden",
                        headerExpanded ? "opacity-100 max-h-[100px]" : "opacity-0 max-h-0 pointer-events-none"
                    )}>
                        <div className="flex items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                    Exam Platform
                                </h1>
                                <p className="text-gray-500 text-xs mt-1">
                                    Logged in as <span className="font-semibold text-gray-700 dark:text-gray-100">{userName}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             {/* Daily Spinner */}
                            <button
                                onClick={() => setShowSpinner(true)}
                                className="p-2 rounded-lg text-fuchsia-500 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-colors relative"
                                title="Daily Spin"
                            >
                                <Gift size={20} className={canSpin ? "animate-bounce" : ""} />
                                {canSpin && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                )}
                            </button>

                            <button
                                onClick={() => setShowDonateModal(true)}
                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors animate-pulse"
                                title="Support Project"
                            >
                                <Heart size={20} className={showDonateModal ? "fill-rose-500" : ""} />
                            </button>
                            <button
                                onClick={() => setView('history')}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    view === 'history' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-gray-950"
                                )}
                                title="History"
                            >
                                <Clock size={20} />
                            </button>
                            <button
                                onClick={() => {
                                    setNameInput(userName);
                                    setShowSettings(true);
                                }}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-gray-950 rounded-lg transition-colors"
                            >
                                <Settings size={20} />
                            </button>
                            <div className="mx-1">
                                <ThemeToggle />
                            </div>
                            {/* Achievements Icon */}
                            <button
                                onClick={() => setShowAchievements(!showAchievements)}
                                className="p-2 rounded-lg transition-colors relative text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-gray-800"
                                title="Achievements"
                            >
                                <Trophy size={20} />
                                {unlockedLeagues.includes('Mythic') && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                            </button>

                            {/* Stars Icon */}
                            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/10 px-2 py-1.5 rounded-lg border border-yellow-200 dark:border-yellow-700/30">
                                <span className="text-xs">⭐</span>
                                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-500">{userStars}</span>
                            </div>
                            {view !== 'list' && (
                                <button
                                    onClick={() => {
                                        // Just switch view, state is preserved in activeTest/savedProgress via TestRunner effect usually but here we rely on active set
                                        // Actually, if we just set view to list, testrunner unmounts.
                                        // We need to ensure progress is saved. TestRunner does this on unmount/change usually if we pass a handler.
                                        // Ideally "Back" just hides the view.
                                        setView('list');
                                        // Note: activeTest in State is kept until we null it or replace it.
                                        // But to be sure, we rely on SavedProgress state which is updated by TestRunner.
                                        setActiveTest(null);
                                    }}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-950 px-4 py-2 rounded-lg"
                                >
                                    <List size={16} /> Back to List
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navbar Toggle Handle - Up/Down Logic for Header */}
                    <button
                        onClick={() => setHeaderExpanded(!headerExpanded)}
                        className={clsx(
                            "absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-6 rounded-b-xl bg-white dark:bg-gray-900 border-x border-b border-gray-100 dark:border-gray-800 shadow-sm text-gray-400 hover:text-blue-600 transition-all z-20",
                            headerExpanded ? "bottom-0 translate-y-full" : "bottom-0 translate-y-full"
                        )}
                        title={headerExpanded ? "Collapse Header" : "Expand Header"}
                    >
                         {headerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </header>

                {showSettings && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
                            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">Settings</h2>
                            <form onSubmit={handleNameSubmit}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900 dark:text-gray-100"
                                    placeholder="Your full name"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Save Changes
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Achievements Modal */}
                {showAchievements && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950/50">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        <Trophy className="text-yellow-500" fill="currentColor" />
                                        Achievements
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">Unlock badges by dominating the tests.</p>
                                </div>
                                <button onClick={() => setShowAchievements(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6 space-y-4">
                                {/* Mythic */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-red-50 to-white dark:bg-none dark:bg-gray-800 border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
                                    <div className="bg-red-100 p-3 rounded-full text-red-600 z-10">
                                        <Trophy size={32} />
                                    </div>
                                    <div className="flex-1 z-10">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            Mythic
                                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Ultimate</span>
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Answer <span className="font-bold text-gray-900 dark:text-gray-100">30 questions consecutively</span> in <span className="font-bold text-purple-600">Impossible Mode</span>.
                                        </p>
                                    </div>
                                    <div className="absolute -right-6 -bottom-6 text-red-500/10 z-0">
                                        <Trophy size={120} />
                                    </div>
                                </div>

                                {/* Legendary */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white dark:bg-none dark:bg-gray-800 border border-amber-100 dark:border-amber-900/30 relative overflow-hidden group">
                                    <div className="bg-amber-100 p-3 rounded-full text-amber-600 z-10">
                                        <Crown size={32} />
                                    </div>
                                    <div className="flex-1 z-10">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                            Legendary
                                            <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Elite</span>
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Get <span className="font-bold text-gray-900 dark:text-gray-100">100% Score</span> in <span className="font-bold text-red-600">Insane Mode</span>.
                                        </p>
                                    </div>
                                </div>

                                {/* Epic */}
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                                    <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                                        <Swords size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">Epic</h3>
                                        <p className="text-sm text-gray-500">Score 85% or higher (Max available in Hard Mode).</p>
                                    </div>
                                </div>

                                {/* Diamond */}
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:bg-gray-950 transition-colors">
                                    <div className="bg-cyan-100 p-3 rounded-full text-cyan-600">
                                        <Gem size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">Diamond</h3>
                                        <p className="text-sm text-gray-500">Score 70% or higher.</p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

                {showSpinner && (
                    <DailySpinner 
                        onClose={() => setShowSpinner(false)} 
                        onReward={handleSpinReward}
                        canSpin={canSpin}
                    />
                )}

                {showDonateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden">
                            {/* Decorative Background */}
                            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-rose-500 to-pink-600 opacity-10 rounded-b-[3rem] pointer-events-none" />

                            <button
                                onClick={() => setShowDonateModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-50"
                            >
                                <XCircle size={24} />
                            </button>

                            <div className="relative z-10 text-center">
                                <div className="bg-rose-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-rose-600 ring-4 ring-rose-50">
                                    <Heart size={32} className="fill-rose-500 animate-pulse" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Loyiha Rivojiga Hissa Qo'shing</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    Agar ushbu loyiha sizga foydali bo'lgan bo'lsa, o'z minnatdorchiligingizni bildirishingiz mumkin.
                                </p>

                                <div className="space-y-3 text-left">
                                    {/* TBC Bank Card */}
                                    <div
                                        className="relative w-full aspect-[1.586/1] rounded-xl shadow-lg group cursor-pointer hover:scale-[1.02] transition-transform duration-300 select-none overflow-hidden bg-gray-900"
                                        onClick={() => {
                                            navigator.clipboard.writeText('9860356624152985');
                                            setCardCopied(true);
                                            setTimeout(() => setCardCopied(false), 2000);
                                        }}
                                    >
                                        <img
                                            src="/card.webp"
                                            alt="Bank Card"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />

                                        {/* Dark Overlay for reliability if image is too bright */}
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors"></div>

                                        <div className="flex flex-col justify-between h-full relative z-10 p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg tracking-wider text-white drop-shadow-md">TBC BANK</span>
                                                </div>
                                                <span className={clsx(
                                                    "text-[10px] px-2 py-1 rounded-md transition-colors duration-300 font-medium flex items-center gap-1 backdrop-blur-md shadow-sm border border-white/20",
                                                    cardCopied ? "bg-green-500 text-white" : "bg-black/40 text-white"
                                                )}>
                                                    {cardCopied ? (
                                                        <>
                                                            <CheckCircle2 size={12} />
                                                            Nusxalandi
                                                        </>
                                                    ) : "Nusxalash"}
                                                </span>
                                            </div>

                                            <div className="flex flex-col items-center justify-center flex-1 my-2">
                                                <div className="font-mono text-xl sm:text-2xl tracking-[0.14em] drop-shadow-md text-white whitespace-nowrap">
                                                    9860 3566 2415 2985
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] text-white/80 uppercase tracking-widest mb-0.5">Card Holder</span>
                                                    <div className="text-sm font-medium uppercase tracking-widest text-shadow text-white">Maxmudbek Muzaffarov</div>
                                                </div>
                                                <div className="mb-0.5">
                                                    {/* Humo Logo text fallback or icon */}
                                                    <span className="font-bold italic text-xl tracking-widest text-white/90 drop-shadow-md">HUMO</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Method Selection & QR Code */}
                                <div className="mt-6">
                                    <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                        {['payme', 'click', 'uzum'].map((method) => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200",
                                                    paymentMethod === method
                                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                                                        : "text-gray-500 hover:text-gray-700"
                                                )}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center relative group min-h-[180px]">
                                        <div className="w-40 h-40 bg-gray-50 dark:bg-gray-950 rounded-lg flex items-center justify-center mb-2 overflow-hidden shadow-inner relative">
                                            {/* Default Placeholder Icon if image fails to load */}
                                            <div className="absolute inset-0 flex items-center justify-center z-0">
                                                <Smartphone className="text-gray-300 w-12 h-12" />
                                            </div>

                                            {/* Actual QR Image - Place files named qr-payme.jpg, qr-click.jpg, qr-uzum.jpg in public folder */}
                                            <img
                                                key={paymentMethod}
                                                src={`/qr-${paymentMethod}.jpg`}
                                                alt={`${paymentMethod} QR`}
                                                className="w-full h-full object-cover relative z-10"
                                                onError={(e) => e.currentTarget.style.display = 'none'} // Hide if not found
                                            />
                                        </div>
                                        <p className="text-sm font-medium text-gray-600">Scan to pay via <span className="capitalize font-bold text-gray-800 dark:text-gray-200">{paymentMethod}</span></p>
                                        <p className="text-[10px] text-gray-400 mt-1">Camera to'g'rilang</p>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-400 mt-6">
                                    Sizning yordamingiz server xarajatlari va yangi testlar qo'shish uchun sarflanadi. Rahmat! ❤️
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {showUploadModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                            <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <XCircle size={24} />
                            </button>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                <Upload className="text-blue-600" /> Upload Test
                            </h2>
                            <form onSubmit={handleUploadSubmit}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                                <select
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                    value={uploadFolder}
                                    onChange={(e) => setUploadFolder(e.target.value)}
                                >
                                    <option value="">General (Root)</option>
                                    {folders.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>

                                <label className="block text-sm font-medium text-gray-700 mb-1">Test File (JSON)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 dark:bg-gray-950 transition-colors mb-6 relative">
                                    <input
                                        type="file"
                                        name="fileInput"
                                        accept=".json"
                                        required
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">Click or Drag JSON file here</p>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Upload Test
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {view === 'list' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Main Grid Content */}
                        <div className={clsx("transition-all duration-300 space-y-8", sidebarExpanded ? "lg:col-span-9" : "lg:col-span-12")}>
                            <section>
                                <div className="flex justify-between items-end mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <List className="text-blue-500" /> Available Tests
                                    </h2>
                                    <button
                                        onClick={() => { setUploadFolder(folders[0] || ''); setShowUploadModal(true); }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                    >
                                        <Upload size={16} /> Upload Test
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Default Tests Grouped by Category */}
                                    {Object.entries(tests.defaultTests.reduce((acc, test) => {
                                        const category = test.category || 'General';
                                        if (!acc[category]) acc[category] = [];
                                        acc[category].push(test);
                                        return acc;
                                    }, folders.reduce((acc, f) => ({ ...acc, [f]: [] }), {}))).sort(([catA, testsA], [catB, testsB]) => {
                                        const hasTestsA = testsA.length > 0;
                                        const hasTestsB = testsB.length > 0;
                                        if (hasTestsA && !hasTestsB) return -1;
                                        if (!hasTestsA && hasTestsB) return 1;
                                        return catA.localeCompare(catB);
                                    }).map(([category, categoryTests]) => (
                                        <div key={category} className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-6 border border-gray-100 dark:border-gray-800/30">
                                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
                                                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 p-2 rounded-lg">
                                                    <Folder size={20} className="fill-current" />
                                                </span>
                                                {category}
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {categoryTests.length > 0 ? categoryTests.map(test => {
                                                    const isCommunity = test.type === 'uploaded';
                                                    const badgeLabel = isCommunity ? "Community" : "Official";
                                                    const badgeColor = isCommunity ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";

                                                    // Check if Updated recently (e.g. within 3 days)
                                                    const isUpdated = test.updatedAt && (new Date() - new Date(test.updatedAt) < 3 * 24 * 60 * 60 * 1000);

                                                    return (
                                                        <TestCard
                                                            key={test.id}
                                                            test={test}
                                                            onStart={(t) => startTest(t || test)}
                                                            badge={badgeLabel}
                                                            badgeColor={badgeColor}
                                                            isUpdated={isUpdated}
                                                            hasProgress={!!savedProgress[test.id]}
                                                        />
                                                    );
                                                }) : (
                                                    <div className="col-span-2 text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 dark:border-gray-800/50 rounded-lg">
                                                        No tests available in this subject. <button onClick={() => { setUploadFolder(category); setShowUploadModal(true); }} className="text-blue-500 hover:underline">Upload one?</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Uploaded Tests */}
                                    {tests.uploadedTests.length > 0 && (
                                        <div className="bg-gray-50 dark:bg-gray-950/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800/50">
                                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                                                    <Upload size={20} />
                                                </span>
                                                Uploaded / Community
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-4">
                                                {tests.uploadedTests.map(test => (
                                                    <TestCard
                                                        key={test.id}
                                                        test={test}
                                                        onStart={(t) => startTest(t || test)}
                                                        badge="Community"
                                                        badgeColor="bg-green-100 text-green-700"
                                                        hasProgress={!!savedProgress[test.id]}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tests.defaultTests.length === 0 && tests.uploadedTests.length === 0 && (
                                        <div className="col-span-2 p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 dark:bg-gray-950/50">
                                            No tests available. Upload one to get started.
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Leaderboard Section */}
                            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        <Trophy className="text-yellow-500" /> Leaderboard
                                    </h2>

                                    <div className="flex flex-wrap justify-center items-center gap-3">
                                        <button
                                            onClick={() => setShowAchievements(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border bg-white dark:bg-transparent text-gray-500 border-gray-200 dark:border-orange-500/50 dark:text-orange-500 hover:text-orange-600 hover:border-orange-300 shadow-sm"
                                        >
                                            <Crown size={14} /> Achievements Rules
                                        </button>

                                        <div className="flex justify-center gap-2 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                            {['today', '3days', '7days', 'all'].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setFilterPeriod(p)}
                                                    className={clsx(
                                                        "px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all",
                                                        filterPeriod === p
                                                            ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm border border-gray-100 dark:border-gray-800/50"
                                                            : "text-gray-400 hover:text-gray-600"
                                                    )}
                                                >
                                                    {p === 'all' ? 'All Time' : p === '3days' ? '3 Days' : p === '7days' ? '7 Days' : 'Today'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {leaderboard.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 italic">No results yet. Be the first!</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-gray-800/50 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                                    <th className="pb-3 w-16 px-1">Rank</th>
                                                    <th className="pb-3 w-48 px-2">User</th>
                                                    <th className="pb-3 w-32 px-2">Title</th>
                                                    <th className="pb-3 px-2">Test</th>
                                                    <th className="pb-3 w-24 px-2">Mode</th>
                                                    <th className="pb-3 w-24 px-2">Time</th>
                                                    <th className="pb-3 w-24 px-2">Duration</th>
                                                    <th className="pb-3 w-24 px-2 text-right">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {leaderboard.map((entry, idx) => {
                                                    const percentage = (entry.score / entry.total) * 100;
                                                    const league = getLeague(entry.score, entry.total, entry.difficulty, entry.duration, entry.questions, entry.answers);

                                                    const diffConfig = DIFFICULTIES.find(d => d.id === (entry.difficulty || 'easy')) || DIFFICULTIES[0];
                                                    const DiffIcon = diffConfig.icon;

                                                    const LeagueIcon = league.icon;
                                                    return (
                                                        <tr key={idx} className={clsx("transition-all", league.rowClass)}>
                                                            <td className="py-4 px-2 flex justify-center">
                                                                {idx < 3 ? (
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2",
                                                                        idx === 0 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                                            idx === 1 ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                                                "bg-orange-50 text-orange-800 border-orange-200"
                                                                    )}>
                                                                        {idx + 1}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 font-mono text-sm">#{idx + 1}</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                <div className="flex flex-col">
                                                                    {league.name === 'Mythic' ? (
                                                                        <span className="text-base font-medium font-extrabold flex justify-center">
                                                                            {entry.name.split('').map((char, i) => (
                                                                                <span key={i} className="mythic-blood relative inline-block mx-[0.5px]">
                                                                                    {char === ' ' ? '\u00A0' : char}
                                                                                </span>
                                                                            ))}
                                                                        </span>
                                                                    ) : (
                                                                        <span className={clsx("text-base font-medium", league.textClass)}>
                                                                            {entry.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                {league.name === 'Mythic' ? (
                                                                    <span className={clsx(
                                                                        "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold mx-auto",
                                                                        league.badgeClass,
                                                                        "animate-pulse" // Added pulse here
                                                                    )}>
                                                                        <Trophy size={12} className="text-[#ff0000] drop-shadow-sm" />
                                                                        {league.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className={clsx("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold mx-auto", league.badgeClass)}>
                                                                        <LeagueIcon size={12} className={percentage === 100 ? "animate-pulse" : ""} />
                                                                        {league.name}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-sm text-gray-500 font-medium px-2">{entry.testName}</td>
                                                            <td className="py-3 px-2">
                                                                <div className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold border", diffConfig.bg, diffConfig.color, diffConfig.border)}>
                                                                    <DiffIcon size={10} />
                                                                    {diffConfig.name}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 text-sm text-gray-400 px-2">{timeAgo(entry.date)}</td>
                                                            <td className="py-3 text-sm text-gray-500 font-mono px-2">{formatDuration(entry.duration)}</td>
                                                            <td className="py-3 text-right px-2">
                                                                <span className="font-bold text-lg text-gray-700">{entry.score}</span>
                                                                <span className="text-gray-400 text-xs ml-1">/ {entry.total}</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Sidebar - Online Users & Schedule */}
                        {/* Sidebar Toggle Handle */}
                        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[60]">
                            <button
                                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                                className={clsx(
                                    "flex items-center justify-center w-6 h-16 rounded-l-2xl bg-white dark:bg-gray-800 border-y border-l border-gray-200 dark:border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.1)] text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:w-8 hover:bg-gray-50 dark:hover:bg-gray-700",
                                )}
                                title={sidebarExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
                            >
                                {sidebarExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                            </button>
                        </div>

                        <div className={clsx("lg:col-span-3 transition-all duration-300 relative", sidebarExpanded ? "w-full opacity-100" : "w-0 opacity-0 overflow-hidden lg:col-span-0 hidden")}>
                            <div className="sticky top-28 space-y-6">
                                {/* Active Users Widget */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full relative"></div>
                                        </div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Online Users</h3>
                                        <span className="text-xs font-mono text-gray-400 ml-auto bg-gray-50 dark:bg-gray-950 px-2 py-0.5 rounded-full border border-gray-100 dark:border-gray-800/50">
                                            {globalActiveUsers.length}
                                        </span>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {!isUsersLoaded && globalActiveUsers.length === 0 ? (
                                            <div className="flex justify-center p-4">
                                                <Loader2 className="animate-spin text-blue-500" size={20} />
                                            </div>
                                        ) : globalActiveUsers.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-4">No active users.</p>
                                        ) : (
                                            [...globalActiveUsers]
                                                .sort((a, b) => (a.userId === userId ? -1 : b.userId === userId ? 1 : 0))
                                                .map((user, idx) => {
                                                    const isMe = user.userId === userId;
                                                    return (
                                                        <div key={idx} className={clsx(
                                                            "flex items-center gap-3 p-2 rounded-lg transition-colors border",
                                                            isMe
                                                                ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                                                : "hover:bg-gray-50 dark:bg-gray-950 border-transparent hover:border-gray-100 dark:border-gray-800/50"
                                                        )}>
                                                            <div className={clsx(
                                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border",
                                                                isMe
                                                                    ? "bg-blue-600 text-white border-blue-600 animate-float"
                                                                    : "bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 border-indigo-200"
                                                            )}>
                                                                {isMe ? <User size={14} /> : user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        {user.stars !== undefined && (
                                                                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-[#1a1b26] px-1 py-0.5 rounded border border-yellow-100 dark:border-yellow-600/30" title="Total Stars">
                                                                                <span>⭐</span>{user.stars}
                                                                            </span>
                                                                        )}
                                                                        <p className={clsx("text-sm font-semibold truncate", isMe ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-100")}>
                                                                            {isMe ? "Me" : user.name}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span title={user.country || "Unknown Country"} className="cursor-help select-none transition-all">
                                                                            <CountryFlag countryCode={user.country} />
                                                                        </span>
                                                                        {user.device === 'mobile'
                                                                            ? <Smartphone size={12} className="text-gray-400" />
                                                                            : <Monitor size={12} className="text-gray-400" />
                                                                        }
                                                                        {/* Theme Indicator */}
                                                                        {user.theme === 'dark' ? (
                                                                            <Moon size={12} className="text-gray-400" title="Dark Mode" />
                                                                        ) : (
                                                                            <Sun size={12} className="text-amber-500" title="Light Mode" />
                                                                        )}

                                                                        {/* Spectate Button */}
                                                                        {!isMe && user.status === 'in-test' && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setSpectatingUser(user);
                                                                                }}
                                                                                title="Watch this user"
                                                                                className="p-1 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded transition-colors"
                                                                            >
                                                                                <Eye size={14} />
                                                                            </button>
                                                                        )}
                                                                        {user.status === 'browsing' && (
                                                                            <span className="w-2 h-2 rounded-full bg-green-500" title="Browsing"></span>
                                                                        )}
                                                                    </div>
                                                                </div>


                                                                {user.status === 'in-test' ? (
                                                                    <div
                                                                        onClick={() => !isMe && setSpectatingUser(user)}
                                                                        className="flex items-center gap-1.5 mt-0.5 cursor-pointer hover:opacity-80"
                                                                    >
                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 rounded truncate max-w-[100px] inline-block">
                                                                            Taking Test
                                                                        </span>
                                                                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                                                                            <div
                                                                                className="h-full bg-blue-500"
                                                                                style={{ width: `${((user.progress) / user.total) * 100}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className={clsx("text-[10px] mt-0.5", isMe ? "text-blue-400" : "text-gray-400")}>Browsing list...</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-gray-50">
                                        <p className="text-xs text-center text-gray-400">
                                            Shows users currently active in a test
                                        </p>
                                    </div>
                                </div>

                                {/* Exam Schedule Widget */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-5 border-t-4 border-t-indigo-500">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                        <Calendar className="text-indigo-500" size={18} /> Exam Schedule
                                    </h3>
                                    <div className="space-y-4">
                                        {[
                                            { name: "Digitalization", day: "13", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Abdurasul B." },
                                            { name: "Data Mining", day: "15", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Abdurasul B." },
                                            { name: "Software Project Management", day: "17", month: "Jan", time: "12:00", room: "Lab-403", teacher: "Usmanov M." },
                                            { name: "Software for Sustainable Dev", day: "20", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Jamshid Y." },
                                            { name: "Mobile Apps (Native & Web)", day: "22", month: "Jan", time: "10:00", room: "Lab-403", teacher: "Salokhiddinov M." },
                                        ].map((item, idx) => {
                                            // Calculate time remaining (Assuming Year 2026)
                                            const examDate = new Date(`${item.month} ${item.day}, 2026 ${item.time}`);
                                            const now = new Date();
                                            const diffMs = examDate - now;

                                            let timeStatus = "";
                                            let statusColor = "text-gray-400";

                                            if (diffMs < 0) {
                                                timeStatus = "Finished";
                                            } else {
                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                                                if (diffDays > 7) {
                                                    timeStatus = `${diffDays}d left`;
                                                    statusColor = "text-emerald-500 font-medium";
                                                } else if (diffDays >= 3) {
                                                    timeStatus = `${diffDays}d ${diffHours}h`;
                                                    statusColor = "text-blue-500 font-medium";
                                                } else if (diffDays >= 1) {
                                                    timeStatus = `${diffDays}d ${diffHours}h`;
                                                    statusColor = "text-amber-500 font-bold";
                                                } else {
                                                    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                    if (diffHours < 1) {
                                                        timeStatus = `${diffMinutes}m left`;
                                                        statusColor = "text-rose-600 font-extrabold animate-pulse bg-rose-50 border-rose-100";
                                                    } else {
                                                        timeStatus = `${diffHours}h ${diffMinutes}m`;
                                                        statusColor = "text-rose-500 font-bold";
                                                    }
                                                }
                                            }

                                            return (
                                                <div key={idx} className="flex gap-3 items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-950/50 hover:bg-white dark:bg-gray-800 hover:shadow-md border border-transparent hover:border-gray-100 dark:border-gray-800/50 transition-all">
                                                    <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-gray-100 dark:border-gray-800/50 w-14 h-14 shrink-0">
                                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{item.month}</span>
                                                        <span className="text-xl font-black text-gray-800 dark:text-gray-200 leading-none">{item.day}</span>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate pr-2">{item.name}</h4>
                                                            <span className={clsx("text-[10px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800/50 shadow-sm", statusColor)}>
                                                                {timeStatus}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                                                                <Clock size={10} className="text-gray-400" />
                                                                {item.time}
                                                            </span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                            <span className="text-[11px] text-gray-500">
                                                                {item.room}
                                                            </span>
                                                        </div>

                                                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{item.teacher}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    view === 'history' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <Clock className="text-blue-500" /> Your History
                                </h2>
                                <button
                                    onClick={() => setView('list')}
                                    className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 p-6">
                                {leaderboard.filter(e => e.name === userName).length === 0 ? (
                                    <div className="text-center py-12 text-gray-400">
                                        <Clock size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No test history found for <strong>{userName}</strong>.</p>
                                        <button onClick={() => setView('list')} className="text-blue-500 hover:underline mt-2">Take a test</button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="border-b border-gray-100 dark:border-gray-800/50 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                                    <th className="pb-3 w-48 text-left pl-4">Test</th>
                                                    <th className="pb-3 w-32">Rank</th>
                                                    <th className="pb-3 w-32">Date</th>
                                                    <th className="pb-3 w-24">Duration</th>
                                                    <th className="pb-3 text-right pr-4">Score</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {leaderboard
                                                    .filter(e => e.name === userName)
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by newest
                                                    .map((entry, idx) => {
                                                        // Pass difficulty/duration to get new Badge logic
                                                        const league = getLeague(entry.score, entry.total, entry.difficulty, entry.duration, entry.questions, entry.answers);
                                                        const LeagueIcon = league.icon;
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="hover:bg-gray-50 dark:bg-gray-950 transition-colors cursor-pointer group"
                                                                onClick={() => {
                                                                    if (entry.questions && entry.answers) {
                                                                        setActiveReview(entry);
                                                                        setView('review');
                                                                    } else {
                                                                        alert("Detailed review not available for this record.");
                                                                    }
                                                                }}
                                                            >
                                                                <td className="py-4 pl-4 text-left font-medium text-gray-700 group-hover:text-blue-600">
                                                                    {entry.testName}
                                                                    {(!entry.questions || !entry.answers) && <span className="ml-2 text-[10px] text-gray-400 border px-1 rounded">No Details</span>}
                                                                </td>
                                                                <td className="py-4">
                                                                    <span className={clsx("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold", league.badgeClass)}>
                                                                        <LeagueIcon size={12} /> {league.name}
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 text-sm text-gray-500">
                                                                    {new Date(entry.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                </td>
                                                                <td className="py-4 text-sm text-gray-500 font-mono">
                                                                    {formatDuration(entry.duration)}
                                                                </td>
                                                                <td className="py-4 text-right pr-4">
                                                                    <span className="font-bold text-lg text-gray-700">{entry.score}</span>
                                                                    <span className="text-gray-400 text-xs ml-1">/ {entry.total}</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }

                {
                    view === 'review' && activeReview && (
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <CheckCircle2 className="text-green-500" /> Test Review: {activeReview.testName}
                                </h2>
                                <button
                                    onClick={() => setView('history')}
                                    className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                                >
                                    <ArrowLeft size={16} /> Back to History
                                </button>
                            </div>

                            {/* Score Summary */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 mb-6 flex justify-around items-center">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{activeReview.score} / {activeReview.total}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Score</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">{Math.round((activeReview.score / activeReview.total) * 100)}%</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Accuracy</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-700">{formatDuration(activeReview.duration)}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Time</div>
                                </div>
                            </div>

                            <DetailedReview questions={activeReview.questions} answers={activeReview.answers} />
                        </div>
                    )
                }

                {
                    view === 'test' && activeTest && (
                        <TestRunner
                            key={`${activeTest.id}-${activeTest.startTime}`} // Add key to force remount on retake
                            test={activeTest}
                            userName={userName}
                            userId={userId}
                            userCountry={userCountry}
                            onBack={() => setView('list')}
                            onProgressUpdate={(progress) => saveCurrentProgress(activeTest.id, progress)}
                            userStars={userStars}
                            unlockedLeagues={unlockedLeagues}
                            updateUserStars={updateUserStars}
                            updateUserUnlocks={updateUserUnlocks}
                            spendStars={spendStars}
                            onFinish={(results) => {
                                setActiveTest(prev => ({ ...prev, isFinished: true, ...results }));
                                clearProgress(activeTest.id); // Clear progress on finish
                                saveCurrentProgress(activeTest.id, null); // Ensure cleared in state
                                fetchLeaderboard(); // Refresh leaderboard
                            }}
                            onRetake={() => {
                                clearProgress(activeTest.id);

                                // Re-shuffle for retake
                                const rawQuestions = activeTest.content.test_questions || [];

                                // Easy mode limit logic (User request: 20 random questions for easy mode)
                                let questionsPool = shuffleArray(rawQuestions);
                                if (activeTest.difficultyMode === 'easy' && questionsPool.length > 20) {
                                    questionsPool = questionsPool.slice(0, 20);
                                }

                                const preparedQuestions = questionsPool.map(q => {
                                    const optionsArray = Object.entries(q.options).map(([key, value]) => ({ id: key, text: value }));
                                    return { ...q, shuffledOptions: shuffleArray(optionsArray) };
                                });

                                setActiveTest({
                                    ...activeTest,
                                    questions: preparedQuestions,
                                    currentQuestionIndex: 0,
                                    answers: {},
                                    isFinished: false,
                                    score: 0,
                                    startTime: Date.now() // Update startTime to trigger key change
                                });
                            }}
                        />
                    )
                }
            </div >
            {/* Spectator Modal */}
            {
                spectatingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                            {/* Header */}
                            <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-200">
                                        {spectatingUser.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100">Watching {spectatingUser.name}</h3>
                                            {spectatingUser.device === 'mobile' ? <Smartphone size={14} className="text-gray-400" /> : <Monitor size={14} className="text-gray-400" />}
                                            <span className="text-lg"><CountryFlag countryCode={spectatingUser.country} /></span>
                                        </div>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Live Stream • Question {(spectatingUser.progress || 0) + 1} of {spectatingUser.total}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSpectatingUser(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
                                {(() => {
                                    // Try to find the test
                                    // We look in both defaultTests and uploadedTests (from state)
                                    var test;
                                    if (tests) {
                                        test = [...(tests.defaultTests || []), ...(tests.uploadedTests || [])].find(t => t.id === spectatingUser.testId);
                                    }

                                    if (!test) return (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                            <EyeOff size={48} className="mb-4" />
                                            <p>This user is taking a private or locally uploaded test.</p>
                                            <p className="text-sm">Cannot display question content.</p>
                                        </div>
                                    );

                                    // Safely access questions: test.questions OR test.content.test_questions
                                    const questions = test.questions || test.content?.test_questions;
                                    if (!questions) return <div className="p-4 text-center">Cannot load questions data.</div>;

                                    const question = questions[spectatingUser.progress || 0];
                                    if (!question) return <div className="p-4 text-center">Waiting for question data...</div>;

                                    return (
                                        <div className="max-w-2xl mx-auto">
                                            {/* Question Card */}
                                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                        Question {(spectatingUser.progress || 0) + 1}
                                                    </span>
                                                </div>
                                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 leading-relaxed">
                                                    {question.question}
                                                </h2>
                                            </div>

                                            {/* Options */}
                                            <div className="space-y-3">
                                                {(() => {
                                                    // Handle options whether they are Array or Object
                                                    let optionsArray = [];
                                                    if (Array.isArray(question.options)) {
                                                        optionsArray = question.options;
                                                    } else if (typeof question.options === 'object' && question.options !== null) {
                                                        optionsArray = Object.entries(question.options).map(([key, value]) => ({
                                                            id: key,
                                                            text: value
                                                        }));
                                                    }

                                                    return optionsArray.map((option) => {
                                                        const isSelected = spectatingUser.currentAnswer === option.id;
                                                        return (
                                                            <div key={option.id} className={clsx(
                                                                "p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                                                                isSelected
                                                                    ? "border-indigo-500 bg-indigo-50/50 shadow-md transform scale-[1.01]"
                                                                    : "border-gray-100 dark:border-gray-800/50 bg-white dark:bg-gray-800 opacity-60"
                                                            )}>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={clsx(
                                                                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border",
                                                                        isSelected
                                                                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                                            : "bg-gray-50 dark:bg-gray-950 text-gray-500 border-gray-200"
                                                                    )}>
                                                                        {option.id}
                                                                    </div>
                                                                    <div className="font-medium text-gray-700">{option.text}</div>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="absolute top-1/2 -translate-y-1/2 right-4 text-indigo-600 font-medium text-xs bg-indigo-100 px-2 py-1 rounded-full flex items-center gap-1">
                                                                        <Eye size={12} />
                                                                        Selected
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>

                                            <div className="mt-8 text-center text-xs text-gray-400">
                                                Watching in real-time. Content updates as the user progresses.
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Difficulty Selection Modal */}
            {
                showDifficultyModal && pendingTest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden scale-100">
                            <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950/50">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Select Difficulty</h3>
                                <p className="text-gray-500">Choose your challenge level for <span className="font-semibold text-gray-800 dark:text-gray-200">{pendingTest.name}</span></p>
                            </div>
                            <div className="p-6 space-y-3">
                                {DIFFICULTIES.map((diff) => (
                                    <button
                                        key={diff.id}
                                        onClick={() => launchTest(diff.id)}
                                        className={`w-full group relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${diff.border} dark:border-transparent ${diff.bg || 'bg-white dark:bg-gray-800'} hover:border-current`}
                                    >
                                        <div className={`mr-4 p-3 rounded-full bg-white dark:bg-gray-800 shadow-sm ${diff.color}`}>
                                            <diff.icon size={24} strokeWidth={2.5} />
                                        </div>
                                        <div className="text-left flex-1">
                                            <div className={`font-bold text-lg ${diff.color}`}>{diff.name}</div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                {diff.hints === 0 ? "No hints available" : `${diff.hints} ${diff.hints === 1 ? 'hint' : 'hints'} available`}
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2">
                                            <div className={`p-2 rounded-full ${diff.color} bg-white dark:bg-gray-800 shadow-sm`}>
                                                <Play size={20} fill="currentColor" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 text-center">
                                <button
                                    onClick={() => {
                                        setShowDifficultyModal(false);
                                        setPendingTest(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-800 dark:text-gray-200 font-medium text-sm py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* JSON Error Modal */}
            {
                jsonError && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-red-100">
                            <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-full text-red-600">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-red-900">Format Error</h3>
                                    <p className="text-red-600/90 text-sm">The uploaded JSON file is invalid</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-6">
                                    <p className="text-red-700 font-medium mb-2">Error Details:</p>
                                    <p className="text-red-900 font-mono text-sm break-words">{jsonError}</p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Expected JSON Structure:</p>
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                        <pre className="text-xs text-blue-300 font-mono">
                                            {`{
  "test_questions": [
    {
      "question": "What is 2+2?",
      "options": {
        "a": "3",
        "b": "4",
        "c": "5"
      },
      "correct_answer": "b"
    }
  ]
}`}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
                                <button
                                    onClick={() => setJsonError(null)}
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


        </main >
    );
}

function TestCard({ test, onStart, badge, badgeColor = "bg-blue-100 text-blue-700", hasProgress, isUpdated }) {
    const [selectedLang, setSelectedLang] = useState(() => {
        if (!test.translations) return null;
        return Object.keys(test.translations).includes('en') ? 'en' : Object.keys(test.translations)[0];
    });

    let activeContent = selectedLang && test.translations ? test.translations[selectedLang] : test.content;

    // Normalize content for display
    if (Array.isArray(activeContent)) {
        if (activeContent[0]?.test_questions) activeContent = activeContent[0];
        else if (activeContent[0]?.question) activeContent = { test_questions: activeContent };
    }

    const questionCount = activeContent?.test_questions?.length || 0;

    const languages = test.translations ? Object.keys(test.translations) : [];

    const handleStart = () => {
        if (selectedLang && test.translations) {
            onStart({
                ...test,
                id: `${test.id}_${selectedLang}`, // Unique ID for progress saving
                content: activeContent,
                language: selectedLang
            });
        } else {
            onStart(test);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800/50 flex flex-col justify-between group relative overflow-hidden">
            <div className="flex absolute top-0 right-0">
                {isUpdated && (
                    <div className="bg-emerald-500 text-white text-xs px-2 py-1 font-bold tracking-wide shadow-sm flex items-center gap-1 z-10">
                        <RefreshCcw size={12} strokeWidth={3} /> UPDATED
                    </div>
                )}
                {hasProgress && (
                    <div className={clsx("bg-orange-100 text-orange-700 text-xs px-2 py-1 font-medium flex items-center gap-1", isUpdated ? "" : "rounded-bl-lg")}>
                        <Save size={12} /> Resumable
                    </div>
                )}
            </div>
            <div>
                <div className="flex justify-between items-start mb-3 mt-1">
                    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", badgeColor)}>
                        {badge}
                    </span>
                    <div className="flex gap-2">
                        {languages.length > 1 && (
                            <div
                                className="relative bg-gray-100 dark:bg-gray-700 p-1 rounded-full flex cursor-pointer select-none h-8 w-24 shadow-inner"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle between first 2 languages for simplicity if clickable
                                    const currentIndex = languages.indexOf(selectedLang);
                                    const nextIndex = (currentIndex + 1) % languages.length;
                                    setSelectedLang(languages[nextIndex]);
                                }}
                            >
                                {/* Calculated Active Background */}
                                <div
                                    className="absolute top-1 bottom-1 bg-white dark:bg-gray-800 rounded-full shadow-sm transition-all duration-300 ease-out z-0"
                                    style={{
                                        width: `calc(${100 / languages.length}% - 8px)`,
                                        left: `calc(${(languages.indexOf(selectedLang) * (100 / languages.length))}% + 4px)`
                                    }}
                                />
                                {languages.map(lang => (
                                    <div
                                        key={lang}
                                        onClick={(e) => { e.stopPropagation(); setSelectedLang(lang); }}
                                        className={clsx(
                                            "flex-1 z-10 flex items-center justify-center text-[10px] font-extrabold uppercase transition-colors rounded-full",
                                            selectedLang === lang ? "text-blue-600 dark:text-blue-400 scale-110" : "text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100"
                                        )}
                                    >
                                        {lang}
                                    </div>
                                ))}
                            </div>
                        )}
                        {(!test.translations || Object.keys(test.translations).length <= 1) && (
                            <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                                JSON
                            </span>
                        )}
                    </div>
                </div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1 group-hover:text-blue-600 transition-colors">
                    {test.name}
                </h3>
                <p className="text-gray-500 text-sm">
                    {questionCount} Questions
                </p>
            </div>
            <button
                onClick={handleStart}
                className={clsx(
                    "mt-6 w-full py-2.5 rounded-lg border font-medium transition-all flex items-center justify-center gap-2",
                    hasProgress
                        ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 hover:text-blue-600 hover:border-blue-200 dark:hover:text-blue-400 dark:hover:border-blue-700"
                )}
            >
                {hasProgress ? <Play size={18} /> : <Play size={18} />}
                {hasProgress ? "Resume Attempt" : "Start Attempt"}
            </button>
        </div>
    );
}

function TranslatableText({ text, translation, type = 'text' }) {
    if (!translation) return <span>{text}</span>;

    return (
        <div className="group relative inline-block cursor-help border-b border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors rounded px-1 -mx-1">
            {text}
            <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[300px] z-50 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-xl relative text-center leading-relaxed">
                    <span className="text-[10px] uppercase text-gray-400 font-bold block mb-0.5 border-b border-gray-700 pb-1">Translation</span>
                    {translation}
                    <div className="w-2 h-2 bg-gray-900 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 rotate-45"></div>
                </div>
            </div>
        </div>
    );
}

function TestRunner({ test, userName, userId, userCountry, onFinish, onRetake, onProgressUpdate, onBack, userStars, unlockedLeagues, updateUserStars, updateUserUnlocks, spendStars }) {
    const { resolvedTheme } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(test.currentQuestionIndex || 0);
    const [answers, setAnswers] = useState(test.answers || {});
    const [isFinished, setIsFinished] = useState(test.isFinished || false);
    const [animatedScorePercent, setAnimatedScorePercent] = useState(0);
    const [showLegendaryEffect, setShowLegendaryEffect] = useState(false);

    useEffect(() => {
        if (isFinished) {
            const score = test.questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);
            const totalQuestions = test.questions.length;
            const percentage = Math.round((score / totalQuestions) * 100);

            // Small delay to allow render before animating
            const timer = setTimeout(() => {
                setAnimatedScorePercent(percentage);
                if (percentage === 100) {
                    setShowLegendaryEffect(true);
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        zIndex: 9999
                    });
                    
                    setTimeout(() => setShowLegendaryEffect(false), 3000);
                }
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setAnimatedScorePercent(0);
        }
    }, [isFinished, test.questions, answers]);

    // Determine max hints based on unlocks
    const getMaxHints = (mode) => {
        let max = 0;
        const diffConfig = DIFFICULTIES.find(d => d.id === mode);
        if (diffConfig) max = diffConfig.hints; // Default

        // Apply Multipliers
        // Legendary: ~3.33x -> Easy(3->10)
        // Mythic: ~5x -> Easy(3->15)

        let multiplier = 1;
        if (unlockedLeagues && unlockedLeagues.includes('Mythic')) multiplier = 5;
        else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) multiplier = 3.33;

        // Apply to base. 
        // Easy (3): 3 * 3.33 ~ 10. 3 * 5 = 15.
        // Middle (1): 1 * 3.33 ~ 3. 1 * 5 = 5.
        // Hard/Insane/Impossible (0). Multiplier doesn't help if base is 0.
        // But user said: "qolgan mode larda mos ravishda bolsin" which implies they should also get bonuses?
        // Usually Hard/Insane have 0 hints. 10 * 0 = 0.
        // Let's assume user wants *some* hints even in hard modes if they are Legendary?
        // Or strictly proportional. 
        // Let's assume strictly proportional to *Easy* base if base is 0? No, that's cheating.
        // Let's stick to Easy/Middle multipliers first.
        // If mode is 'hard' (0), maybe give 1 for Legendary, 2 for Mythic?

        if (max === 0) {
            // Bonus for 0-hint modes
            if (multiplier >= 5) max = 2;       // Mythic gets 2 in Hard/Insane/Imp?
            else if (multiplier >= 3) max = 1;  // Legendary gets 1
        } else {
            max = Math.round(max * multiplier);
        }

        return max;
    };

    const initialHintsCount = test.hintsLeft !== undefined ? test.hintsLeft : getMaxHints(test.difficultyMode);
    const [hintsLeft, setHintsLeft] = useState(initialHintsCount);
    const [revealedHints, setRevealedHints] = useState(test.revealedHints || {}); // { qIdx: [id1, id2] }

    // Logic for Spinner Bonus Hints
    const [extraHints, setExtraHints] = useState(0);
    useEffect(() => {
        const storedExtra = localStorage.getItem('examApp_extraHints');
        if (storedExtra) setExtraHints(parseInt(storedExtra, 10));
    }, []);

    // Timed Mode State
    const difficultyConfig = DIFFICULTIES.find(d => d.id === test.difficultyMode) || DIFFICULTIES[0];
    const baseTimeLimit = difficultyConfig.timeLimit; // seconds or null

    // Initial Time is Base + Banked (only for current question, but careful about resuming)
    // If resuming, `test.timeLeft` might be saved? `timeLeft` isn't in onProgressUpdate schema explicitly I think?
    // Let's assume new question or reset.
    // If we have saved progress, we probably should have saved `timeLeft`.
    // For now, let's treat "initialTime" as the starting pool for the *current* question.

    // If we are strictly following "Impossible" mode per-question timer:
    // When index changes, we reset `timeLeft`.

    // Restore BankedTime State
    const [bankedTime, setBankedTime] = useState(test.bankedTime || 0);

    const getQuestionsTimeLimit = () => {
        if (test.difficultyMode === 'impossible' && baseTimeLimit) {
            return baseTimeLimit + bankedTime;
        }
        return baseTimeLimit;
    };

    const [currentQuestionTimeLimit, setCurrentQuestionTimeLimit] = useState(getQuestionsTimeLimit());
    const [timeLeft, setTimeLeft] = useState(test.timeLeft !== undefined ? test.timeLeft : currentQuestionTimeLimit);

    // Track first render to handle resume gracefully
    const isFirstRender = useRef(true);

    // Reset logic when question changes (Standard for Impossible mode which is usually per question)
    useEffect(() => {
        // Skip reset on first render if we have a resumed time to preserve it
        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (test.timeLeft !== undefined) return; 
        }

        // When index changes, reset timer
        if (baseTimeLimit !== null && !isFinished) {
            // Reset to base time limit + bonus
            const newLimit = (test.difficultyMode === 'impossible' ? baseTimeLimit + bankedTime : baseTimeLimit);
            setCurrentQuestionTimeLimit(newLimit);
            setTimeLeft(newLimit);
        }
    }, [currentIndex, baseTimeLimit, isFinished]); // Removed bankedTime from deps because we act on index change

    // Timer Countdown Effect
    useEffect(() => {
        if (baseTimeLimit === null || isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleNext(); // Auto-skip
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [currentIndex, isFinished, answers, baseTimeLimit]); // Re-start when index changes

    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Report System State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [activeReportQuestion, setActiveReportQuestion] = useState(null);
    const [showConfirmSkip, setShowConfirmSkip] = useState(false);

    const [activeUsers, setActiveUsers] = useState([]);

    // User local country state isn't available inside TestRunner props unless passed.
    // However, we need to send it in heartbeat.
    // We can fetch it again or pass it. 
    // Fetching again is easiest to avoid prop drilling mania for now, or just use localStorage if we saved it.
    // To keep it clean, let's grab it from localStorage if available or re-fetch lightly.
    // Actually, TestRunner is child of Home, but Home holds the state `userCountry`.
    // Let's pass `userCountry` as prop to TestRunner.


    const question = test.questions[currentIndex];

    // Hint Logic
    const handleUseHint = () => {
        if ((hintsLeft <= 0 && extraHints <= 0) || isFinished) return;

        const currentRevealed = revealedHints[currentIndex] || [];
        // Only consider options that are WRONG and NOT YET REVEALED
        const incorrectOptions = question.shuffledOptions.filter(o =>
            o.id !== question.correct_answer &&
            !currentRevealed.includes(o.id)
        );

        if (incorrectOptions.length === 0) return; // No more hints possible

        // Eliminate one random incorrect option
        const toEliminate = incorrectOptions[Math.floor(Math.random() * incorrectOptions.length)];

        setRevealedHints(prev => ({
            ...prev,
            [currentIndex]: [...(prev[currentIndex] || []), toEliminate.id]
        }));
        
        if (hintsLeft > 0) {
            setHintsLeft(prev => prev - 1);
        } else if (extraHints > 0) {
            const newVal = extraHints - 1;
            setExtraHints(newVal);
            localStorage.setItem('examApp_extraHints', newVal.toString());
        }
    };

    // Find translation if available
    const translatedQuestion = test.translationContent?.test_questions?.find(q => q.id === question.id);

    const totalQuestions = test.questions.length;

    // Determine which question is being reported (default to current if not set)
    const reportingQuestion = activeReportQuestion || question;

    // Use a ref to access current onProgressUpdate without triggering effect
    const onProgressUpdateRef = useRef(onProgressUpdate);
    useEffect(() => {
        onProgressUpdateRef.current = onProgressUpdate;
    });

    // Report progress to parent whenever state changes
    useEffect(() => {
        if (!isFinished) {
            if (onProgressUpdateRef.current) {
                onProgressUpdateRef.current({
                    questions: test.questions, // Keep the same shuffled order
                    currentQuestionIndex: currentIndex,
                    answers: answers,
                    hintsLeft,
                    revealedHints,
                    difficultyMode: test.difficultyMode, // SAVE DIFFICULTY MODE
                    bankedTime, // Save banked time too for correct resume
                    timeLeft: timeLeft // Save remaining time for exact resume
                });
            }

            // Post to active sessions
            fetch('/api/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId: test.id,
                    userId: userId, // Use stable ID
                    name: userName,
                    progress: currentIndex,
                    total: totalQuestions,
                    device: getDeviceType(),
                    country: userCountry,
                    currentAnswer: answers[currentIndex], // Send the selected answer for the current question
                    stars: userStars, // Send star count
                    theme: resolvedTheme
                })
            }).catch(e => console.error("Active status update failed", e));
        }
    }, [currentIndex, answers, isFinished, test.questions, test.id, userName, userId, totalQuestions, userCountry, hintsLeft, revealedHints, userStars, resolvedTheme]);

    // Poll for other active users
    useEffect(() => {
        const fetchActive = async () => {
            try {
                const res = await fetch(`/api/active?testId=${test.id}`);
                const data = await res.json();
                // Filter out self by ID
                const others = data.filter(u => u.userId !== userId);
                setActiveUsers(others);
            } catch (e) { console.error(e); }
        };

        const interval = setInterval(fetchActive, 5000);
        fetchActive();

        return () => clearInterval(interval);
    }, [test.id, userId]);

    const handleReportSubmit = async () => {
        if (!reportReason.trim()) return;

        setIsReporting(true);
        try {
            await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    testId: test.id,
                    questionId: reportingQuestion.id,
                    questionText: reportingQuestion.question,
                    reason: reportReason,
                    user: userName
                })
            });

            setShowReportModal(false);
            setReportReason("");
            setActiveReportQuestion(null);
            alert("Thanks! We'll review this question.");
        } catch (error) {
            console.error(error);
            alert("Failed to submit report");
        } finally {
            setIsReporting(false);
        }
    };

    const handleAnswer = (optionId) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionId }));
    };

    const handleNext = () => {
        // Check if answered
        if (!answers[currentIndex]) {
            setShowConfirmSkip(true);
            return;
        }
        proceedToNext();
    };

    const proceedToNext = () => {
        // Time Banking Logic
        if (test.difficultyMode === 'impossible' && baseTimeLimit !== null) {
            // FIX: If we answer, we save the remaining time. 
            // BUT we do NOT add it to previous banked time, because previous banked time is already INSIDE timeLeft.
            // Example: Limit 14s (8+6). Answer at 12s left. Bank becomes 12s. Next Limit = 8+12 = 20s.
            // Correct Rollover.
            const unusedTime = Math.max(0, timeLeft);
            setBankedTime(unusedTime);
        }

        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(currentIndex + 1);
            setShowConfirmSkip(false);
        } else {
            setShowConfirmFinish(true);
        }
    };

    // Clear active user session on unmount or finish
    useEffect(() => {
        const cleanup = () => {
            fetch(`/api/active?userId=${userId}`, { method: 'DELETE', keepalive: true });
        };
        // Add beforeunload for tab close
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [test.id, userId]);

    const confirmFinish = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            let score = 0;
            test.questions.forEach((q, idx) => {
                if (answers[idx] === q.correct_answer) {
                    score++;
                }
            });

            // Calculate duration
            const endTime = Date.now();
            const durationMs = endTime - (test.startTime || endTime); // prevent negative if startTime missing based on reload

            // Remove from active users list specifically on finish
            try {
                await fetch(`/api/active?userId=${userId}`, { method: 'DELETE' });
            } catch (e) {
                console.error("Failed to clear active session", e);
            }

            // Submit to leaderboard
            await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: userName,
                    testName: test.name, // Ensure this matches schema
                    score: score,
                    total: totalQuestions,
                    date: new Date().toISOString(),
                    duration: durationMs,
                    questions: test.questions, // Store snapshot
                    answers: answers,
                    difficulty: test.difficultyMode // Save Difficulty to Leaderboard
                })
            });

            setIsFinished(true);
            setShowConfirmFinish(false);

            // --- NEW REWARD LOGIC ---
            // 1. Stars: "har bir togri savolga yulduz berilsin"
            let starMultiplier = 1;
            if (unlockedLeagues && unlockedLeagues.includes('Mythic')) starMultiplier = 2;
            else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) starMultiplier = 1.5;

            const starsEarned = Math.floor(score * starMultiplier);

            if (updateUserStars) {
                // Add score to current stars
                updateUserStars(starsEarned);
            }

            // 2. Achievements (Unlocks)
            // Check if achieved Mythic/Legendary
            const league = getLeague(score, totalQuestions, test.difficultyMode, durationMs, test.questions, answers);
            if (updateUserUnlocks && league.name) {
                updateUserUnlocks(league.name);
            }

            // Pass up results
            onFinish({ answers, isFinished: true, score });
        } catch (error) {
            console.error("Finish error", error);
            alert("Error submitting results. Please try again.");
            setIsSubmitting(false);
        }
    };

    if (isFinished) {
        const score = test.questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);
        const percentage = Math.round((score / totalQuestions) * 100);

        let starMultiplier = 1;
        if (unlockedLeagues && unlockedLeagues.includes('Mythic')) starMultiplier = 2;
        else if (unlockedLeagues && unlockedLeagues.includes('Legendary')) starMultiplier = 1.5;

        const starsEarned = Math.floor(score * starMultiplier);

        return (
            <>
                {showLegendaryEffect && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <svg viewBox="0 0 500 200" className="w-[80vw] max-w-2xl animate-in zoom-in-50 duration-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]">
                            <defs>
                                <path id="curve" d="M 50 150 Q 250 20 450 150" fill="transparent" />
                                <linearGradient id="gold-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FDE68A" />
                                    <stop offset="50%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#B45309" />
                                </linearGradient>
                            </defs>
                            <text width="500">
                                <textPath xlinkHref="#curve" startOffset="50%" textAnchor="middle" className="text-6xl font-black uppercase tracking-widest" style={{ fill: "url(#gold-grad)", fontSize: "60px", fontWeight: "900", fontFamily: "cursive, sans-serif" }}>
                                    LEGENDARY
                                </textPath>
                            </text>
                        </svg>
                    </div>
                )}
                {/* Back Button for Finished View */}
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors bg-white dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
                >
                    <ArrowLeft size={16} /> Back to List
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800/50 overflow-hidden">
                    <div className="p-8 text-center bg-gray-900 text-white flex flex-col items-center">
                        <h2 className="text-3xl font-bold mb-2">Test Completed!</h2>
                        <p className="opacity-80 mb-8">Here is how you performed</p>

                        {/* Speedometer Gauge */}
                        <div className="relative w-72 h-36 overflow-hidden mb-4 p-4">
                            {/* Scale Ticks (Lines) */}
                            {Array.from({ length: 11 }).map((_, i) => {
                                const deg = (i * 10 / 100) * 180 - 90; // 0 to 180 mapped to -90 to 90
                                return (
                                    <div
                                        key={i}
                                        className="absolute bottom-4 left-1/2 w-0.5 h-36 origin-bottom z-20 pointer-events-none"
                                        style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
                                    >
                                        <div className="w-full h-3 bg-white dark:bg-gray-800/50 absolute top-0"></div>
                                    </div>
                                );
                            })}

                            {/* Gauge Background (Colored Segments) */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 h-32 overflow-hidden">
                                <div className="w-64 h-64 rounded-full"
                                    style={{
                                        background: `conic-gradient(from 270deg, 
                                        #ef4444 0deg, #ef4444 36deg, 
                                        #f97316 36deg, #f97316 72deg, 
                                        #eab308 72deg, #eab308 108deg,
                                        #3b82f6 108deg, #3b82f6 144deg, 
                                        #22c55e 144deg, #22c55e 180deg)`,
                                        maskImage: 'radial-gradient(transparent 60%, black 61%)',
                                        WebkitMaskImage: 'radial-gradient(transparent 60%, black 61%)',
                                        transform: 'rotate(-90deg)'
                                    }}
                                ></div>
                            </div>

                            {/* Needle */}
                            <div
                                className="absolute bottom-4 left-1/2 w-1 h-32 origin-bottom transition-transform duration-[2000ms] cubic-bezier(0.34, 1.56, 0.64, 1) z-30"
                                style={{
                                    transform: `translateX(-50%) rotate(${(animatedScorePercent / 100) * 180 - 90}deg)`
                                }}
                            >
                                <div className="w-1.5 h-[90%] bg-white dark:bg-gray-800 rounded-t-full mx-auto mt-[10%] shadow-lg border border-gray-300"></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-white dark:bg-gray-800 rounded-full shadow-xl border-4 border-gray-200 z-40"></div>
                            </div>

                            {/* Internal Text */}
                            <div className="absolute bottom-0 left-0 w-full text-center pb-2 z-30">
                                <div className="text-4xl font-extrabold text-white drop-shadow-md">{score}</div>
                                <div className="text-[10px] text-gray-300 uppercase tracking-widest">of {totalQuestions}</div>
                            </div>
                        </div>

                        <div className="mt-2 text-3xl font-bold bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                            {percentage}% Score
                        </div>

                        {/* Stars and Multiplier Display */}
                        <div className="mt-4 flex items-center justify-center gap-4 bg-gray-800/50 py-2 px-6 rounded-full border border-gray-700/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-yellow-400 font-bold text-xl">
                                <Star className="fill-yellow-400" size={24} />
                                <span>+{starsEarned}</span>
                            </div>

                            <div className={clsx(
                                "text-xs font-bold px-2 py-1 rounded uppercase tracking-wider",
                                starMultiplier > 1 ? "bg-purple-900 text-purple-200 border border-purple-700" : "bg-gray-700 text-gray-400 border border-gray-600"
                            )}>
                                Multiplier x{starMultiplier}
                            </div>
                        </div>
                    </div>

                    <div className="p-0">
                        <div className="bg-gray-50 dark:bg-gray-950 px-6 py-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Detailed Review</h3>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                            {test.questions.map((q, idx) => {
                                const userAnswer = answers[idx];
                                const isCorrect = userAnswer === q.correct_answer;
                                const userOption = q.shuffledOptions.find(o => o.id === userAnswer);
                                const correctOption = q.shuffledOptions.find(o => o.id === q.correct_answer);

                                return (
                                    <div key={q.id} className="p-6 hover:bg-gray-50 dark:bg-gray-950 transition-colors group">
                                        <div className="flex gap-4">
                                            <div className="mt-1">
                                                {isCorrect ? (
                                                    <CheckCircle2 className="text-green-500" size={24} />
                                                ) : (
                                                    <XCircle className="text-red-500" size={24} />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-gray-900 dark:text-gray-100 pr-4">
                                                        <span className="text-gray-400 mr-2">#{idx + 1}</span>
                                                        {q.question}
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            setActiveReportQuestion(q);
                                                            setShowReportModal(true);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Report Issue"
                                                    >
                                                        <Flag size={16} />
                                                    </button>
                                                </div>
                                                <div className="text-sm space-y-1">
                                                    <div className={clsx("flex items-center gap-2", isCorrect ? "text-green-700" : "text-red-700")}>
                                                        <span className="font-semibold w-24 flex-shrink-0">Your Answer:</span>
                                                        <span>{userOption ? userOption.text : "Skipped"}</span>
                                                    </div>
                                                    {!isCorrect && (
                                                        <div className="flex items-center gap-2 text-green-700">
                                                            <span className="font-semibold w-24 flex-shrink-0">Correct:</span>
                                                            <span>{correctOption?.text}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800/50 flex justify-center">
                        <button
                            onClick={onRetake}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <RefreshCcw size={20} /> Retake Test
                        </button>
                    </div>
                </div>

                {/* Report Modal (Duplicate for Finished State) */}
                {showReportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-4">
                                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                    <Flag size={20} />
                                </div>
                                <h3 className="text-lg font-bold">Report Issue</h3>
                            </div>
                            <p className="text-gray-500 mb-4 text-sm">
                                Help us improve! What's wrong with Question <span className="font-mono bg-gray-100 px-1 rounded">#{reportingQuestion.id}</span>?
                            </p>

                            {/* Quick Reason Buttons */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {["Answer is incorrect", "Question is incomplete", "Spelling mistake", "Duplicate question"].map((reason) => (
                                    <button
                                        key={reason}
                                        onClick={() => setReportReason(prev => prev ? prev + ", " + reason : reason)}
                                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full transition-colors border border-gray-200"
                                    >
                                        {reason}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                placeholder="E.g. The correct answer should be B because..."
                                className="w-full border border-gray-200 bg-gray-50 dark:bg-gray-950 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowReportModal(false);
                                        setReportReason("");
                                        setActiveReportQuestion(null);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportSubmit}
                                    disabled={!reportReason.trim() || isReporting}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                                >
                                    {isReporting ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (!question) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center mt-12">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Question</h3>
                <p className="text-gray-500 mb-6">Unable to load question #{currentIndex + 1}.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    Refresh Application
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/50 flex flex-col min-h-[500px] mt-12 relative">
                {/* Progress Bar */}
                <div className="h-8 bg-gray-200 w-full relative rounded-t-2xl">
                    {/* Steps */}
                    <div className="flex h-full rounded-2xl overflow-hidden gap-[1px]">
                        {Array.from({ length: totalQuestions }).map((_, i) => {
                            let statusColor = "bg-gray-200 dark:bg-gray-700"; // Default/Pending
                            if (i === currentIndex) {
                                statusColor = "progress-wave shadow-[0_0_10px_rgba(37,99,235,0.5)] z-10 border-none"; // Current with wave animation
                            } else if (answers[i]) {
                                statusColor = "bg-green-500"; // Answered
                            } else if (i < currentIndex) {
                                statusColor = "bg-yellow-400"; // Skipped/Unanswered passed
                            }

                            return (
                                <div
                                    key={i}
                                    className={`flex-1 transition-all duration-300 ${statusColor}`}
                                />
                            );
                        })}
                    </div>
                    {/* Active User Markers */}
                    {/* Current User Marker */}
                    <div
                        className="absolute bottom-full flex flex-col items-center z-20 group transition-all duration-300 ease-out -translate-x-1/2 animate-float"
                        style={{ left: `calc(${((currentIndex) / totalQuestions) * 100}% - 1px)` }}
                    >
                        <div className="bg-green-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-0.5 shadow-sm whitespace-nowrap">You</div>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-green-600"></div>
                    </div>

                    {activeUsers.map((user, idx) => (
                        <div
                            key={idx}
                            className="absolute bottom-full flex flex-col items-center z-10 transition-all duration-500 ease-out -translate-x-1/2"
                            style={{ left: `calc(${((user.progress) / totalQuestions) * 100}% - 1px)` }}
                            title={`${user.name} is here`}
                        >
                            <div className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm mb-0.5 whitespace-nowrap min-w-[20px] text-center">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-amber-400"></div>
                        </div>
                    ))}
                </div>

                <div className="p-6 md:p-10 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
                        <div className="flex items-center gap-3">
                            {/* Stars Display */}
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-[#282b33] dark:text-yellow-500 dark:border-transparent rounded-lg font-bold text-xs" title="Your Stars">
                                <span>⭐</span>
                                <span>{userStars}</span>
                            </div>
                            <button
                                onClick={onBack}
                                className="text-gray-400 hover:text-gray-600 transition-colors mr-1 hover:bg-gray-100 p-1 rounded-lg"
                                title="Back to list"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <span>Question {currentIndex + 1} of {totalQuestions}</span>
                        </div>

                        {/* Timer Display */}
                        {timeLeft !== null && (
                            <div className={clsx(
                                "flex items-center gap-1.5 font-bold font-mono text-lg rounded px-2 py-0.5",
                                timeLeft <= 5 ? "text-red-600 bg-red-100 animate-pulse" : "text-gray-700 bg-gray-100"
                            )}>
                                <Clock size={16} />
                                {timeLeft}s
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {/* Hint Button */}
                            {(hintsLeft > 0 || extraHints > 0) ? (
                                <button
                                    onClick={handleUseHint}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-[#282b33] dark:hover:bg-[#323640] dark:text-yellow-500 dark:border-transparent rounded-lg transition-colors text-xs font-bold mr-2 animate-in fade-in"
                                    title="Use a hint to remove one wrong answer"
                                >
                                    <Lightbulb size={14} className="fill-yellow-500 text-yellow-500" />
                                    <span>Use Hint ({hintsLeft + extraHints})</span>
                                </button>
                            ) : (
                                /* Buy Hint Button */
                                <button
                                    onClick={() => {
                                        if (spendStars && userStars >= 5) {
                                            if (spendStars(5)) {
                                                setHintsLeft(prev => prev + 1);
                                            }
                                        } else {
                                            alert("Not enough stars! You need 5 stars for a hint.");
                                        }
                                    }}
                                    className={clsx(
                                        "flex items-center gap-1.5 px-3 py-1.5 border rounded-lg transition-colors text-xs font-bold mr-2",
                                        userStars >= 5
                                            ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 cursor-pointer"
                                            : "bg-gray-50 dark:bg-gray-950 text-gray-400 border-gray-200 cursor-not-allowed"
                                    )}
                                    title="Buy a hint for 5 stars"
                                >
                                    <div className='flex items-center gap-1'>
                                        <span>⭐ 5</span>
                                        <span>Buy Hint</span>
                                    </div>
                                </button>
                            )}
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">ID: {question.id}</span>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="text-gray-400 hover:text-gray-600 transition-colors mr-1 hover:bg-gray-100 p-1 rounded-lg"
                                title="Back to listuestion"
                            >
                                <Flag size={14} />
                            </button>
                        </div>
                    </div>

                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 leading-relaxed">
                        <TranslatableText
                            text={question.question}
                            translation={translatedQuestion?.question}
                        />
                    </h2>

                    <div className="space-y-3 flex-1">
                        {question.shuffledOptions.map((option, idx) => {
                            const isSelected = answers[currentIndex] === option.id;
                            const isEliminated = (revealedHints[currentIndex] || []).includes(option.id);
                            // Find option translation in translatedQuestion
                            // Note: option.id is 'A', 'B', etc.
                            const translatedOptionText = translatedQuestion?.options?.[option.id];

                            return (
                                <button
                                    key={idx}
                                    disabled={isEliminated}
                                    onClick={() => !isEliminated && handleAnswer(option.id)}
                                    className={clsx(
                                        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3",
                                        isEliminated ? "opacity-30 cursor-not-allowed border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-950 grayscale" : (
                                            isSelected
                                                ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                                                : "border-gray-100 dark:border-gray-800/50 hover:border-blue-200 hover:bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-100"
                                        )
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transiton-colors",
                                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-gray-800 border-gray-200 text-gray-400"
                                    )}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="font-medium">
                                        <TranslatableText
                                            text={option.text}
                                            translation={translatedOptionText}
                                        />
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-10 flex justify-between items-center">
                        <button
                            onClick={() => {
                                // Explicit early finish
                                setShowConfirmFinish(true);
                            }}
                            className="text-gray-500 hover:text-red-600 font-medium text-sm px-4 py-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        >
                            End Test Now
                        </button>

                        <button
                            onClick={handleNext}
                            className={clsx(
                                "px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all",
                                answers[currentIndex]
                                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg cursor-pointer"
                            )}
                        >
                            {currentIndex === totalQuestions - 1 ? 'Finish Test' : 'Next Question'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmFinish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Finish Test?</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to finish? {Object.keys(answers).length < totalQuestions && (
                                <span className="block mt-2 text-red-600 font-medium">
                                    You have {totalQuestions - Object.keys(answers).length} unanswered questions.
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmFinish(false)}
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                            >
                                No, Continue
                            </button>
                            <button
                                onClick={confirmFinish}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Saving...
                                    </>
                                ) : "Yes, Finish"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 mb-4">
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <Flag size={20} />
                            </div>
                            <h3 className="text-lg font-bold">Report Issue</h3>
                        </div>
                        <p className="text-gray-500 mb-4 text-sm">
                            Help us improve! What's wrong with Question <span className="font-mono bg-gray-100 px-1 rounded">#{reportingQuestion.id}</span>?
                        </p>

                        {/* Quick Reason Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {["Answer is incorrect", "Question is incomplete", "Spelling mistake", "Duplicate question"].map((reason) => (
                                <button
                                    key={reason}
                                    onClick={() => setReportReason(prev => prev ? prev + ", " + reason : reason)}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full transition-colors border border-gray-200"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                            placeholder="E.g. The correct answer should be B because..."
                            className="w-full border border-gray-200 bg-gray-50 dark:bg-gray-950 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason("");
                                    setActiveReportQuestion(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReportSubmit}
                                disabled={!reportReason.trim() || isReporting}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                            >
                                {isReporting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Skip Confirmation Modal */}
            {showConfirmSkip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Skip Question?</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to skip this question without answering? It will be marked as incorrect.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmSkip(false)}
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={proceedToNext}
                                className="flex-1 py-2.5 rounded-lg bg-yellow-500 font-semibold text-white hover:bg-yellow-600 transition-colors shadow-md"
                            >
                                Yes, Skip
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Additional components like TranslatableText should remain if not imported?
// Assuming they are defined elsewhere or above in scope if this was a full replace.
// But since we are multi-replacing, they are fine.
