'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Play, CheckCircle2, XCircle, RefreshCcw, User, Save, List, Trophy, AlertTriangle, Settings, Crown, Gem, Shield, Swords, Flag, MessageSquare, ArrowLeft, Clock, Folder } from 'lucide-react';
import clsx from 'clsx';

function getLeague(score, total) {
    const percentage = (score / total) * 100;

    // 100% - MYTHIC (RGB / Shine)
    if (percentage === 100) return { 
        name: 'Mythic', 
        badgeClass: 'bg-gray-900/5 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.4)] font-extrabold',
        textClass: 'font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 drop-shadow-sm',
        rowClass: 'bg-gradient-to-r from-indigo-50/40 via-purple-50/40 to-pink-50/40 border-l-4 border-l-purple-500',
        icon: Crown
    };

    // 95-99% - LEGENDARY (Gold / Fire)
    if (percentage >= 95) return { 
        name: 'Legendary', 
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] font-bold',
        textClass: 'font-bold text-amber-700 drop-shadow-[0_1px_1px_rgba(251,191,36,0.3)]',
        rowClass: 'bg-gradient-to-r from-amber-50/50 to-transparent border-l-4 border-l-amber-400',
        icon: Crown 
    };

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

    // Reporting logic (Replicated or can be passed)
    // For simplicity, we keep it visual or basic here since this might be history view
    // Real reporting needs testId, which we might not have in pure history view unless passed
    
    // We can disable reporting in History view for now or assume it works
    const reportingQuestion = activeReportQuestion || {};

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-0">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Detailed Review</h3>
                </div>
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {questions.map((q, idx) => {
                        const userAnswer = answers[idx]; // Note: this relies on index, assumes questions order is same
                        const isCorrect = userAnswer === q.correct_answer;
                        const userOption = q.shuffledOptions.find(o => o.id === userAnswer);
                        const correctOption = q.shuffledOptions.find(o => o.id === q.correct_answer);

                        return (
                            <div key={q.id || idx} className="p-6 hover:bg-gray-50 transition-colors group">
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
                                            <p className="font-medium text-gray-900 pr-4">
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

export default function Home() {
  const [tests, setTests] = useState({ defaultTests: [], uploadedTests: [] });
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'test', 'upload', 'history', 'review'
  const [activeTest, setActiveTest] = useState(null);
  const [activeReview, setActiveReview] = useState(null); // For history review

  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(''); // Unique Session ID
  const [nameInput, setNameInput] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [globalActiveUsers, setGlobalActiveUsers] = useState([]);
  
  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  
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
        } catch(e) { console.error("Failed to parse progress", e); }
    }

    // 3. Fetch initial data
    fetchTests();
    fetchLeaderboard();
    fetchGlobalActiveUsers();
    
    // 4. Set up intervals
    const interval = setInterval(fetchGlobalActiveUsers, 5000);
    
    // 5. Send heartbeat for "Browsing" status if we have a username
    const heartbeatInterval = setInterval(() => {
        const currentName = localStorage.getItem('examApp_userName');
        if (currentName) {
            // Only send if NOT in a test (activeTest handles its own heartbeat)
            // But we can't easily access current activeTest state here inside effect closure without refs or dependencies
            // So we rely on a check. However, activeTest state is available in render scope, but this effect runs ONCE.
            // Better to use a separate effect that depends on [view, userName]
        }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Separate effect for main page heartbeat
  useEffect(() => {
      if (view === 'list' && isNameSet && userName && userId) {
          const sendHeartbeat = () => {
              fetch('/api/active', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      userId: userId,
                      name: userName,
                      status: 'browsing'
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
  }, [view, isNameSet, userName, userId]); // Remove dependency on empty array content changes

  const fetchGlobalActiveUsers = async () => {
      try {
          const res = await fetch('/api/active');
          if (res.ok) {
              const data = await res.json();
              setGlobalActiveUsers(data);
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
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
            const data = await res.json();
            setLeaderboard(data);
        }
    } catch(e) {
        console.error("Leaderboard fetch error", e);
    }
  };

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
    // Check if there is a translation available (simple mapping for en.json -> uz.json)
    let translationContent = null;
    if (test.id === 'en.json') {
        const uzTest = tests.defaultTests.find(t => t.id === 'uz.json');
        if (uzTest) translationContent = uzTest.content;
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

    // New test setup
    const rawQuestions = test.content.test_questions || [];
    
    const preparedQuestions = shuffleArray(rawQuestions).map(q => {
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
      ...test,
      questions: preparedQuestions,
      translationContent, // Pass translation
      currentQuestionIndex: 0,
      answers: {}, // { questionId: optionId }
      isFinished: false,
      score: 0,
      startTime: Date.now() // Track start time
    };

    setActiveTest(newTestState);
    setView('test');
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
            alert("Failed to upload test");
        }
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  if (!isNameSet) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
              <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
                  <div className="text-center mb-6">
                      <div className="bg-blue-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-blue-600">
                          <User size={32} />
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900">Welcome!</h1>
                      <p className="text-gray-500 mt-2">Please enter your name to start.</p>
                  </div>
                  <form onSubmit={handleNameSubmit}>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900"
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
    </div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-4 z-40 transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Exam Platform
                  </h1>
                  <p className="text-gray-500 text-xs mt-1">
                      Logged in as <span className="font-semibold text-gray-700">{userName}</span>
                  </p>
              </div>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => setView('history')}
                  className={clsx(
                    "p-2 rounded-lg transition-colors",
                    view === 'history' ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
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
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <Settings size={20} />
                </button>
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
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors bg-gray-50 px-4 py-2 rounded-lg"
                    >
                        <List size={16} /> Back to List
                    </button>
                )}
            </div>
        </header>

        {showSettings && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
                     <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                         <XCircle size={24} />
                     </button>
                     <h2 className="text-xl font-bold text-gray-800 mb-4">Settings</h2>
                     <form onSubmit={handleNameSubmit}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all mb-4 text-gray-900"
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

        {showUploadModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                 <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
                     <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                         <XCircle size={24} />
                     </button>
                     <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Upload className="text-blue-600" /> Upload Test
                     </h2>
                     <form onSubmit={handleUploadSubmit}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
                          <select 
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none mb-4 bg-white text-gray-900"
                            value={uploadFolder}
                            onChange={(e) => setUploadFolder(e.target.value)}
                          >
                             <option value="">General (Root)</option>
                             {folders.map(f => (
                                 <option key={f} value={f}>{f}</option>
                             ))}
                          </select>

                          <label className="block text-sm font-medium text-gray-700 mb-1">Test File (JSON)</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors mb-6 relative">
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
            <div className="lg:col-span-9 space-y-8">
            <section>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
                        <div key={category} className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span className="bg-yellow-100 text-yellow-600 p-2 rounded-lg">
                                    <Folder size={20} className="fill-current" />
                                </span>
                                {category}
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {categoryTests.length > 0 ? categoryTests.map(test => (
                                    <TestCard 
                                        key={test.id} 
                                        test={test} 
                                        onStart={() => startTest(test)} 
                                        badge="Official"
                                        hasProgress={!!savedProgress[test.id]}
                                    />
                                )) : (
                                     <div className="col-span-2 text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-lg">
                                        No tests available in this subject. <button onClick={() => { setUploadFolder(category); setShowUploadModal(true); }} className="text-blue-500 hover:underline">Upload one?</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Uploaded Tests */}
                    {tests.uploadedTests.length > 0 && (
                        <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
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
                                        onStart={() => startTest(test)} 
                                        badge="Community" 
                                        badgeColor="bg-green-100 text-green-700" 
                                        hasProgress={!!savedProgress[test.id]}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {tests.defaultTests.length === 0 && tests.uploadedTests.length === 0 && (
                        <div className="col-span-2 p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            No tests available. Upload one to get started.
                        </div>
                    )}
                </div>
            </section>

            {/* Leaderboard Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                    <Trophy className="text-yellow-500" /> Leaderboard
                </h2>
                {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic">No results yet. Be the first!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-center">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                    <th className="pb-3 w-16 px-2">Rank</th>
                                    <th className="pb-3 w-48 px-2 text-left">User</th>
                                    <th className="pb-3 w-32 px-2">Title</th>
                                    <th className="pb-3 px-2">Test</th>
                                    <th className="pb-3 w-24 px-2">Time</th>
                                    <th className="pb-3 w-24 px-2">Duration</th>
                                    <th className="pb-3 w-24 px-2 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leaderboard.map((entry, idx) => {
                                    const percentage = (entry.score / entry.total) * 100;
                                    const league = getLeague(entry.score, entry.total);
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
                                            <td className="py-3 px-2 text-left">
                                                <div className="flex flex-col">
                                                    <span className={clsx("text-base font-medium", league.textClass)}>
                                                        {entry.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2">
                                                <span className={clsx("inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold mx-auto", league.badgeClass)}>
                                                    <LeagueIcon size={12} className={percentage === 100 ? "animate-pulse" : ""} /> 
                                                    {league.name}
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm text-gray-500 font-medium px-2">{entry.testName}</td>
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

            {/* Sidebar - Online Users */}
            <div className="lg:col-span-3">
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-28">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full relative"></div>
                        </div>
                        <h3 className="font-bold text-gray-800">Online Users</h3>
                        <span className="text-xs font-mono text-gray-400 ml-auto bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                            {globalActiveUsers.length}
                        </span>
                     </div>
                     
                     <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {globalActiveUsers.length === 0 ? (
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
                                        ? "bg-blue-50 border-blue-100" 
                                        : "hover:bg-gray-50 border-transparent hover:border-gray-100"
                                )}>
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border",
                                        isMe 
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-600 border-indigo-200"
                                    )}>
                                        {isMe ? <User size={14} /> : user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className={clsx("text-sm font-semibold truncate", isMe ? "text-blue-700" : "text-gray-700")}>
                                                {isMe ? "Me" : user.name}
                                            </p>
                                            {user.status === 'browsing' && (
                                                <span className="w-2 h-2 rounded-full bg-green-500" title="Browsing"></span>
                                            )}
                                        </div>
                                        
                                        {user.status === 'in-test' ? (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 rounded truncate max-w-[100px] inline-block">
                                                    Taking Test
                                                </span>
                                                <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden max-w-[60px]">
                                                    <div 
                                                        className="h-full bg-blue-500" 
                                                        style={{ width: `${((user.progress + 1) / user.total) * 100}%` }}
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
            </div>
          </div>
        )}

        {view === 'history' && (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-blue-500" /> Your History
                    </h2>
                    <button 
                        onClick={() => setView('list')}
                        className="text-gray-500 hover:text-gray-700 font-medium text-sm flex items-center gap-1"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                                    <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider">
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
                                        const percentage = (entry.score / entry.total) * 100;
                                        const league = getLeague(entry.score, entry.total);
                                        const LeagueIcon = league.icon;
                                        return (
                                            <tr 
                                                key={idx} 
                                                className="hover:bg-gray-50 transition-colors cursor-pointer group"
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
                                                    {new Date(entry.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
        )}

        {view === 'review' && activeReview && (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                     <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-around items-center">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900">{activeReview.score} / {activeReview.total}</div>
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
        )}

        {view === 'test' && activeTest && (
            <TestRunner 
                test={activeTest} 
                userName={userName}
                userId={userId}
                onBack={() => setView('list')}
                onProgressUpdate={(progress) => saveCurrentProgress(activeTest.id, progress)}
                onFinish={(results) => {
                    setActiveTest(prev => ({ ...prev, isFinished: true, ...results }));
                    clearProgress(activeTest.id); // Clear progress on finish
                    saveCurrentProgress(activeTest.id, null); // Ensure cleared in state
                    fetchLeaderboard(); // Refresh leaderboard
                }}
                onRetake={() => {
                    clearProgress(activeTest.id);
                    // We need to re-initiate startTest logic, but since we are inside component, 
                    // we can pass a signal up or just modify the way startTest works.
                    // Easiest is to call the passed start handler from parent if available, or just hack it:
                    // Force restart by clearing progress and calling start again logic:
                    
                    // Re-shuffle for retake
                    const rawQuestions = activeTest.content.test_questions || [];
                    const preparedQuestions = shuffleArray(rawQuestions).map(q => {
                        const optionsArray = Object.entries(q.options).map(([key, value]) => ({ id: key, text: value }));
                        return { ...q, shuffledOptions: shuffleArray(optionsArray) };
                    });

                    setActiveTest({
                        ...activeTest,
                        questions: preparedQuestions,
                        currentQuestionIndex: 0,
                        answers: {},
                        isFinished: false,
                        score: 0
                    });
                }}
            />
        )}
      </div>
    </main>
  );
}

function TestCard({ test, onStart, badge, badgeColor = "bg-blue-100 text-blue-700", hasProgress }) {
    const questionCount = test.content.test_questions?.length || 0;
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between group relative overflow-hidden">
            {hasProgress && (
                <div className="absolute top-0 right-0 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-bl-lg font-medium flex items-center gap-1">
                    <Save size={12} /> Resumable
                </div>
            )}
            <div>
                <div className="flex justify-between items-start mb-3">
                    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide", badgeColor)}>
                        {badge}
                    </span>
                    <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded">
                         JSON
                    </span>
                </div>
                <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                    {test.name}
                </h3>
                <p className="text-gray-500 text-sm">
                    {questionCount} Questions
                </p>
            </div>
            <button 
                onClick={onStart}
                className={clsx(
                    "mt-6 w-full py-2.5 rounded-lg border font-medium transition-all flex items-center justify-center gap-2",
                    hasProgress 
                        ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" 
                        : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200"
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

function TestRunner({ test, userName, userId, onFinish, onRetake, onProgressUpdate, onBack }) {
    const [currentIndex, setCurrentIndex] = useState(test.currentQuestionIndex || 0);
    const [answers, setAnswers] = useState(test.answers || {}); 
    const [isFinished, setIsFinished] = useState(test.isFinished || false);
    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Report System State
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState("");
    const [isReporting, setIsReporting] = useState(false);
    const [activeReportQuestion, setActiveReportQuestion] = useState(null);

    const [activeUsers, setActiveUsers] = useState([]);

    const question = test.questions[currentIndex];
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
                    answers: answers
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
                    total: totalQuestions
                })
            }).catch(e => console.error("Active status update failed", e));
        }
    }, [currentIndex, answers, isFinished, test.questions, test.id, userName, userId, totalQuestions]);

    // Poll for other active users
    useEffect(() => {
        const fetchActive = async () => {
             try {
                const res = await fetch(`/api/active?testId=${test.id}`);
                const data = await res.json();
                // Filter out self by ID
                const others = data.filter(u => u.userId !== userId);
                setActiveUsers(others);
             } catch(e) { console.error(e); }
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
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(currentIndex + 1);
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
                    answers: answers
                })
            });

            setIsFinished(true);
            setShowConfirmFinish(false);
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

        return (
            <>
            {/* Back Button for Finished View */}
            <button 
                onClick={onBack}
                className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm hover:shadow-md"
            >
                <ArrowLeft size={16} /> Back to List
            </button>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-8 text-center bg-gray-900 text-white">
                    <h2 className="text-3xl font-bold mb-2">Test Completed!</h2>
                    <p className="opacity-80">Here is how you performed</p>
                    <div className="mt-8 flex justify-center">
                        <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-8 border-gray-700 bg-gray-800">
                             <div className="text-center">
                                 <div className="text-4xl font-extrabold text-blue-400">{score}</div>
                                 <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">of {totalQuestions}</div>
                             </div>
                        </div>
                    </div>
                    <div className="mt-6 text-2xl font-semibold text-blue-300">
                        {percentage}% Score
                    </div>
                </div>
                
                <div className="p-0">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Detailed Review</h3>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                        {test.questions.map((q, idx) => {
                            const userAnswer = answers[idx];
                            const isCorrect = userAnswer === q.correct_answer;
                            const userOption = q.shuffledOptions.find(o => o.id === userAnswer);
                            const correctOption = q.shuffledOptions.find(o => o.id === q.correct_answer);

                            return (
                                <div key={q.id} className="p-6 hover:bg-gray-50 transition-colors group">
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
                                                <p className="font-medium text-gray-900 pr-4">
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
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
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
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-gray-900 mb-4">
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
                            className="w-full border border-gray-200 bg-gray-50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason("");
                                    setActiveReportQuestion(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm"
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

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[500px] mt-12 relative">
                 {/* Progress Bar */}
                 <div className="h-8 bg-gray-200 w-full relative rounded-t-2xl">
                     {/* Steps */}
                     <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {Array.from({ length: totalQuestions - 1 }).map((_, i) => (
                            <div 
                                key={i} 
                                className="absolute top-0 bottom-0 w-px bg-white/40" 
                                style={{ left: `${((i + 1) / totalQuestions) * 100}%` }}
                            />
                        ))}
                     </div>
                     <div 
                        className={clsx(
                            "h-full bg-blue-600 transition-all duration-300 ease-out rounded-tl-2xl",
                            currentIndex === totalQuestions - 1 && "rounded-tr-2xl"
                        )}
                        style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                     />
                     {/* Active User Markers */}
                     {/* Current User Marker */}
                     <div 
                         className="absolute bottom-full flex flex-col items-center z-20 group transition-all duration-300 ease-out -translate-x-1/2"
                         style={{ left: `calc(${((currentIndex + 1) / totalQuestions) * 100}% - 1px)` }}
                     >
                         <div className="bg-green-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-0.5 shadow-sm whitespace-nowrap">You</div>
                         <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-green-600"></div>
                     </div>

                     {activeUsers.map((user, idx) => (
                         <div 
                            key={idx}
                            className="absolute bottom-full flex flex-col items-center z-10 transition-all duration-500 ease-out -translate-x-1/2"
                            style={{ left: `calc(${((user.progress + 1) / totalQuestions) * 100}% - 1px)` }}
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
                              <button 
                                onClick={onBack}
                                className="text-gray-400 hover:text-gray-600 transition-colors mr-1 hover:bg-gray-100 p-1 rounded-lg"
                                title="Back to list"
                              >
                                <ArrowLeft size={20} />
                              </button>
                              <span>Question {currentIndex + 1} of {totalQuestions}</span>
                          </div>
                          <div className="flex items-center gap-2">
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

                     <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
                         <TranslatableText 
                            text={question.question} 
                            translation={translatedQuestion?.question} 
                         />
                     </h2>

                     <div className="space-y-3 flex-1">
                         {question.shuffledOptions.map((option, idx) => {
                             const isSelected = answers[currentIndex] === option.id;
                             // Find option translation in translatedQuestion
                             // Note: option.id is 'A', 'B', etc.
                             const translatedOptionText = translatedQuestion?.options?.[option.id];

                             return (
                                 <button
                                    key={idx}
                                    onClick={() => handleAnswer(option.id)}
                                    className={clsx(
                                        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3",
                                        isSelected 
                                            ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm" 
                                            : "border-gray-100 hover:border-blue-200 hover:bg-gray-50 text-gray-700"
                                    )}
                                 >
                                     <div className={clsx(
                                         "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border transiton-colors",
                                         isSelected ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-400" 
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
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed" // keep it gray if not answered, but NEXT logic usually allows skipping or not? User didn't specify, assuming forced choice or allow check. Let's force choice for Next, or just style.
                                    // Actually user requirement was "next next bosib davom etib ketadi".
                            )}
                            disabled={!answers[currentIndex]} // Force answer
                         >
                             {currentIndex === totalQuestions - 1 ? 'Finish Test' : 'Next Question'}
                         </button>
                     </div>
                 </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmFinish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-lg font-bold text-gray-900">Finish Test?</h3>
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
                                className="flex-1 py-2.5 rounded-lg border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
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
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 text-gray-900 mb-4">
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
                            className="w-full border border-gray-200 bg-gray-50 rounded-xl p-4 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mb-4 min-h-[120px] resize-none transition-all placeholder:text-gray-400"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason("");
                                    setActiveReportQuestion(null);
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-sm"
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
