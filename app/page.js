'use client';
import { useState, useEffect } from 'react';
import { Loader2, Upload, Play, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';
import clsx from 'clsx';

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

  useEffect(() => {
    fetchTests();
  }, []);

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

  const startTest = (test) => {
    // Prepare the test data: Shuffle questions and options
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

    setActiveTest({
      ...test,
      questions: preparedQuestions,
      currentQuestionIndex: 0,
      answers: {}, // { questionId: optionId }
      isFinished: false,
      score: 0
    });
    setView('test');
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

  if (loading && view === 'list') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
    </div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Exam & Test Platform
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                  Sharpen your skills with our automated testing system
              </p>
            </div>
            {view !== 'list' && (
                <button onClick={() => { setView('list'); setActiveTest(null); }} className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                    Back to List
                </button>
            )}
        </header>

        {view === 'list' && (
          <div className="space-y-8">
            <section>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Available Tests</h2>
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                        <Upload size={16} /> Upload Test
                        <input type="file" accept=".json" className="hidden" onChange={handleUpload} />
                    </label>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Default Tests */}
                    {tests.defaultTests.map(test => (
                        <TestCard key={test.id} test={test} onStart={() => startTest(test)} badge="Official" />
                    ))}
                    {/* Uploaded Tests */}
                    {tests.uploadedTests.map(test => (
                        <TestCard key={test.id} test={test} onStart={() => startTest(test)} badge="Community" badgeColor="bg-green-100 text-green-700" />
                    ))}
                    
                    {tests.defaultTests.length === 0 && tests.uploadedTests.length === 0 && (
                        <div className="col-span-2 p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            No tests available. Upload one to get started.
                        </div>
                    )}
                </div>
            </section>
          </div>
        )}

        {view === 'test' && activeTest && (
            <TestRunner 
                test={activeTest} 
                onFinish={(results) => {
                    setActiveTest(prev => ({ ...prev, isFinished: true, ...results }));
                }}
                onRetake={() => startTest(activeTest)}
            />
        )}
      </div>
    </main>
  );
}

function TestCard({ test, onStart, badge, badgeColor = "bg-blue-100 text-blue-700" }) {
    const questionCount = test.content.test_questions?.length || 0;
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col justify-between group">
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
                className="mt-6 w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
            >
                <Play size={18} /> Start Attempt
            </button>
        </div>
    );
}

function TestRunner({ test, onFinish, onRetake }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { questionIndex: optionId }
    const [isFinished, setIsFinished] = useState(false);

    const question = test.questions[currentIndex];
    const totalQuestions = test.questions.length;

    const handleAnswer = (optionId) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: optionId }));
    };

    const handleNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            finishTest();
        }
    };

    const finishTest = () => {
        let score = 0;
        test.questions.forEach((q, idx) => {
            if (answers[idx] === q.correct_answer) {
                score++;
            }
        });
        setIsFinished(true);
        // We handle internal finish state, but could also propagate up
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
             {/* Progress Bar */}
             <div className="h-2 bg-gray-100 w-full">
                 <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                 />
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

                 <div className="mt-10 flex justify-end">
                     <button 
                        onClick={handleNext}
                        disabled={!answers[currentIndex]}
                        className={clsx(
                            "px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all",
                            answers[currentIndex] 
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5" 
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                     >
                         {currentIndex === totalQuestions - 1 ? 'Finish Test' : 'Next Question'}
                     </button>
                 </div>
             </div>
        </div>
    );
}
