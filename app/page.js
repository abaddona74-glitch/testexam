'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2, Upload, Play, CheckCircle2, XCircle, RefreshCcw, User, Save, List, Trophy, AlertTriangle, Settings, Crown, Gem, Shield, Swords } from 'lucide-react';
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

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function Home() {
  const [tests, setTests] = useState({ defaultTests: [], uploadedTests: [] });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'test', 'upload'
  const [activeTest, setActiveTest] = useState(null);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(''); // Unique Session ID
  const [nameInput, setNameInput] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [globalActiveUsers, setGlobalActiveUsers] = useState([]);
  
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
    // Check if we have saved progress for this test
    if (savedProgress[test.id]) {
        setActiveTest({
            ...test,
            ...savedProgress[test.id],
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
      currentQuestionIndex: 0,
      answers: {}, // { questionId: optionId }
      isFinished: false,
      score: 0
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

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const name = file.name.replace('.json', '') + ' (Uploaded)';
        
        // Send to server to share with "everyone" (in memory)
        const res = await fetch('/api/tests', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ name, content: json })
        });
        
        if (res.ok) {
            await fetchTests();
            setView('list');
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

        {view === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-9 space-y-8">
            <section>
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <List className="text-blue-500" /> Available Tests
                    </h2>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <Upload size={16} /> Upload Test
                        <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Default Tests */}
                    {tests.defaultTests.map(test => (
                        <TestCard 
                            key={test.id} 
                            test={test} 
                            onStart={() => startTest(test)} 
                            badge="Official"
                            hasProgress={!!savedProgress[test.id]}
                        />
                    ))}
                    {/* Uploaded Tests */}
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
                    
                    {tests.defaultTests.length === 0 && tests.uploadedTests.length === 0 && (
                        <div className="col-span-2 p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            No tests available. Upload one to get started.
                        </div>
                    )}
                </div>
            </section>

            {/* Leaderboard Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Trophy className="text-yellow-500" /> Leaderboard
                </h2>
                {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 italic">No results yet. Be the first!</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider">
                                    <th className="pb-3 pl-2 w-16">Rank</th>
                                    <th className="pb-3 w-48">User</th>
                                    <th className="pb-3 w-32">Title</th>
                                    <th className="pb-3">Test</th>
                                    <th className="pb-3 text-right pr-2">Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {leaderboard.map((entry, idx) => {
                                    const percentage = (entry.score / entry.total) * 100;
                                    const league = getLeague(entry.score, entry.total);
                                    const LeagueIcon = league.icon;
                                    return (
                                        <tr key={idx} className={clsx("transition-all", league.rowClass)}>
                                            <td className="py-4 pl-4">
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
                                                    <span className="text-gray-400 font-mono text-sm ml-2.5">#{idx + 1}</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex flex-col">
                                                    <span className={clsx("text-base font-medium", league.textClass)}>
                                                        {entry.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className={clsx("w-fit flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm font-semibold", league.badgeClass)}>
                                                    <LeagueIcon size={12} className={percentage === 100 ? "animate-pulse" : ""} /> 
                                                    {league.name}
                                                </span>
                                            </td>
                                            <td className="py-3 text-sm text-gray-500 font-medium">{entry.testName}</td>
                                            <td className="py-3 text-right pr-4">
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

        {view === 'test' && activeTest && (
            <TestRunner 
                test={activeTest} 
                userName={userName}
                userId={userId}
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

function TestRunner({ test, userName, userId, onFinish, onRetake, onProgressUpdate }) {
    const [currentIndex, setCurrentIndex] = useState(test.currentQuestionIndex || 0);
    const [answers, setAnswers] = useState(test.answers || {}); 
    const [isFinished, setIsFinished] = useState(test.isFinished || false);
    const [showConfirmFinish, setShowConfirmFinish] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);

    const question = test.questions[currentIndex];
    const totalQuestions = test.questions.length;

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
        let score = 0;
        test.questions.forEach((q, idx) => {
            if (answers[idx] === q.correct_answer) {
                score++;
            }
        });
        
        // Remove from active users list specifically on finish
        await fetch(`/api/active?userId=${userId}`, { method: 'DELETE' });
        
        // Submit to leaderboard
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                testName: test.name,
                score: score,
                total: totalQuestions
            })
        });

        setIsFinished(true);
        setShowConfirmFinish(false);
        // Pass up results
        onFinish({ answers, isFinished: true, score });
    };

    if (isFinished) {
        const score = test.questions.reduce((acc, q, idx) => acc + (answers[idx] === q.correct_answer ? 1 : 0), 0);
        const percentage = Math.round((score / totalQuestions) * 100);

        return (
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
                                <div key={q.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="mt-1">
                                            {isCorrect ? (
                                                <CheckCircle2 className="text-green-500" size={24} />
                                            ) : (
                                                <XCircle className="text-red-500" size={24} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 mb-2">
                                                <span className="text-gray-400 mr-2">#{idx + 1}</span>
                                                {q.question}
                                            </p>
                                            <div className="text-sm space-y-1">
                                                <div className={clsx("flex items-center gap-2", isCorrect ? "text-green-700" : "text-red-700")}>
                                                    <span className="font-semibold w-16">Your Answer:</span>
                                                    <span>{userOption ? userOption.text : "Skipped"}</span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="flex items-center gap-2 text-green-700">
                                                        <span className="font-semibold w-16">Correct:</span>
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
        );
    }

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
                 {/* Progress Bar */}
                 <div className="h-8 bg-gray-100 w-full relative">
                     <div 
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                     />
                     {/* Active User Markers */}
                     {/* Current User Marker */}
                     <div 
                         className="absolute top-[-2px] -translate-x-1/2 flex flex-col items-center z-20 group"
                         style={{ left: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                     >
                         <div className="bg-green-600 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded mb-0.5 shadow-sm whitespace-nowrap">You</div>
                         <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-green-600"></div>
                     </div>

                     {activeUsers.map((user, idx) => (
                         <div 
                            key={idx}
                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-amber-400 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-amber-900 shadow-md transform transition-all z-10"
                            style={{ left: `calc(${((user.progress + 1) / totalQuestions) * 100}% - 12px)` }}
                            title={`${user.name} is here`}
                         >
                             {user.name.charAt(0).toUpperCase()}
                         </div>
                     ))}
                 </div>

                 <div className="p-6 md:p-10 flex-1 flex flex-col">
                     <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
                          <span>Question {currentIndex + 1} of {totalQuestions}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-600">ID: {question.id}</span>
                     </div>

                     <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
                         {question.question}
                     </h2>

                     <div className="space-y-3 flex-1">
                         {question.shuffledOptions.map((option, idx) => {
                             const isSelected = answers[currentIndex] === option.id;
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
                                     <span className="font-medium">{option.text}</span>
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
                                className="flex-1 py-2.5 rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 transition-colors shadow-md"
                            >
                                Yes, Finish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
