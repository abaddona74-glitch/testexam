'use client';
import { useState } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Image, Sparkles } from 'lucide-react';

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

const QUESTION_TYPES = [
  { id: 'choice', label: 'Multiple Choice (1 correct)' },
  { id: 'multi_choice', label: 'Checkbox (multiple correct)' },
  { id: 'matching', label: 'Matching / Drag & Drop' },
  { id: 'text_input', label: 'Text Input (manual review)' },
];

function emptyQuestion() {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'choice',
    question: '',
    options: { A: '', B: '', C: '' },
    correct_answer: '',
    image_url: '',
    placeholder: '',
    language: '',
  };
}

export default function TestCreator({ folders, userId, isGodmode, onClose, onUploaded }) {
  const [testName, setTestName] = useState('');
  const [folder, setFolder] = useState(folders[0] || '');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => setQuestions(q => [...q, emptyQuestion()]);
  const removeQuestion = (id) => setQuestions(q => q.filter(x => x.id !== id));
  const moveQuestion = (idx, dir) => {
    const to = idx + dir;
    if (to < 0 || to >= questions.length) return;
    setQuestions(q => {
      const copy = [...q];
      [copy[idx], copy[to]] = [copy[to], copy[idx]];
      return copy;
    });
  };

  const updateQuestion = (id, field, value) => {
    setQuestions(q => q.map(qi => {
      if (qi.id !== id) return qi;
      const updated = { ...qi, [field]: value };
      if (field === 'type') {
        if (value === 'text_input') {
          updated.options = {};
          updated.correct_answer = '';
          updated.placeholder = '';
          updated.language = '';
        } else if (value === 'matching') {
          updated.options = { A: '', B: '' };
          updated.correct_answer = '';
        } else {
          updated.options = { A: '', B: '', C: '' };
          updated.correct_answer = '';
        }
        updated.image_url = '';
      }
      return updated;
    }));
  };

  const updateOption = (id, key, value) => {
    setQuestions(q => q.map(qi => {
      if (qi.id !== id) return qi;
      return { ...qi, options: { ...qi.options, [key]: value } };
    }));
  };

  const addOption = (id) => {
    setQuestions(q => q.map(qi => {
      if (qi.id !== id) return qi;
      const keys = Object.keys(qi.options);
      const nextKey = OPTION_KEYS[keys.length] || String.fromCharCode(65 + keys.length);
      return { ...qi, options: { ...qi.options, [nextKey]: '' } };
    }));
  };

  const removeOption = (id, key) => {
    setQuestions(q => q.map(qi => {
      if (qi.id !== id) return qi;
      const { [key]: _, ...rest } = qi.options;
      return { ...qi, options: rest, correct_answer: qi.correct_answer === key ? '' : qi.correct_answer };
    }));
  };

  const toggleCorrect = (id, key) => {
    setQuestions(q => q.map(qi => {
      if (qi.id !== id) return qi;
      if (qi.type === 'multi_choice') {
        const current = qi.correct_answer ? qi.correct_answer.split(',').map(x => x.trim()) : [];
        const has = current.includes(key);
        const next = has ? current.filter(x => x !== key) : [...current, key];
        return { ...qi, correct_answer: next.join(', ') };
      }
      return { ...qi, correct_answer: qi.correct_answer === key ? '' : key };
    }));
  };

  const validate = () => {
    if (!testName.trim()) return 'Test name is required';
    for (const q of questions) {
      if (!q.question.trim()) return 'All questions must have text';
      if (q.type !== 'text_input') {
        const optKeys = Object.keys(q.options);
        if (optKeys.length < 2) return `Question "${q.question.slice(0, 30)}..." needs at least 2 options`;
        for (const k of optKeys) {
          if (!q.options[k].trim()) return `Option ${k} is empty in: "${q.question.slice(0, 30)}..."`;
        }
        if (!q.correct_answer) return `Select correct answer for: "${q.question.slice(0, 30)}..."`;
      }
    }
    return '';
  };

  const buildJson = () => {
    return {
      test_questions: questions.map(q => {
        const base = { type: q.type, question: q.question };
        if (q.type === 'text_input') {
          if (q.placeholder) base.placeholder = q.placeholder;
          if (q.language) base.language = q.language;
          base.grading = 'manual';
        } else {
          base.options = q.options;
          if (q.type === 'multi_choice') {
            base.correct_answer = q.correct_answer;
          } else {
            base.correct_answer = q.correct_answer;
          }
        }
        if (q.image_url?.trim()) base.image_url = q.image_url.trim();
        return base;
      }),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setUploading(true);

    try {
      const content = buildJson();
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName.trim(),
          content,
          folder,
          isPrivate,
          password: isPrivate ? password : undefined,
          godmode: isGodmode,
          uploaderId: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUploaded?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const renderQuestion = (q, idx) => (
    <div key={q.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
          Q{idx + 1}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
            <MoveUp size={14} />
          </button>
          <button type="button" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">
            <MoveDown size={14} />
          </button>
          <button type="button" onClick={() => removeQuestion(q.id)} disabled={questions.length <= 1} className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <select
        value={q.type}
        onChange={e => updateQuestion(q.id, 'type', e.target.value)}
        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
      >
        {QUESTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>

      <textarea
        placeholder="Enter question text..."
        value={q.question}
        onChange={e => updateQuestion(q.id, 'question', e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 resize-none min-h-[60px]"
      />

      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Image URL (optional)"
          value={q.image_url || ''}
          onChange={e => updateQuestion(q.id, 'image_url', e.target.value)}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
        />
        <Image size={16} className="text-gray-400" />
      </div>

      {q.type === 'text_input' ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Placeholder text (optional)"
            value={q.placeholder || ''}
            onChange={e => updateQuestion(q.id, 'placeholder', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
          />
          <input
            type="text"
            placeholder="Programming language or format hint (optional)"
            value={q.language || ''}
            onChange={e => updateQuestion(q.id, 'language', e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
          />
          <p className="text-[11px] text-gray-400">Text input questions are graded manually.</p>
        </div>
      ) : q.type === 'matching' ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Add key-value pairs (left = key, right = value to match)</p>
          {Object.entries(q.options).map(([key, val]) => (
            <div key={key} className="flex gap-2 items-center">
              <span className="text-xs font-bold w-6 text-gray-500">{key}</span>
              <input
                type="text"
                placeholder="Key (left side)"
                value={val}
                onChange={e => updateOption(q.id, key, e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              />
              {Object.keys(q.options).length > 2 && (
                <button type="button" onClick={() => removeOption(q.id, key)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {Object.keys(q.options).length < 6 && (
            <button type="button" onClick={() => addOption(q.id)} className="text-xs text-blue-600 hover:text-blue-500">
              + Add pair
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(q.options).map(([key, val]) => (
            <div key={key} className="flex gap-2 items-center">
              <input
                type={q.type === 'multi_choice' ? 'checkbox' : 'radio'}
                name={`correct-${q.id}`}
                checked={q.type === 'multi_choice'
                  ? (q.correct_answer || '').split(',').map(x => x.trim()).includes(key)
                  : q.correct_answer === key
                }
                onChange={() => toggleCorrect(q.id, key)}
                className="w-4 h-4"
              />
              <span className="text-xs font-bold w-5 text-gray-500">{key}</span>
              <input
                type="text"
                placeholder={`Option ${key}`}
                value={val}
                onChange={e => updateOption(q.id, key, e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              />
              {Object.keys(q.options).length > 2 && (
                <button type="button" onClick={() => removeOption(q.id, key)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {Object.keys(q.options).length < 6 && (
            <button type="button" onClick={() => addOption(q.id)} className="text-xs text-blue-600 hover:text-blue-500">
              + Add option
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Name</label>
        <input
          type="text"
          value={testName}
          onChange={e => setTestName(e.target.value)}
          placeholder="e.g. Biology Final Exam"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject / Folder</label>
        <input
          list="creator-subject-list"
          value={folder}
          onChange={e => setFolder(e.target.value)}
          placeholder="Choose or type new subject"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
        />
        <datalist id="creator-subject-list">
          <option value="">General</option>
          {folders.map(f => <option key={f} value={f} />)}
        </datalist>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Questions ({questions.length})</span>
          <button type="button" onClick={addQuestion} className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">
            <Plus size={14} /> Add Question
          </button>
        </div>
        {questions.map((q, idx) => renderQuestion(q, idx))}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="creator-private" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="w-4 h-4" />
        <label htmlFor="creator-private" className="text-sm text-gray-600 dark:text-gray-400">Private test (require password)</label>
      </div>
      {isPrivate && (
        <input
          type="text"
          placeholder="Test password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
          required
        />
      )}

      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? (
          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
        ) : (
          <><Sparkles size={18} /> Create Test</>
        )}
      </button>
    </form>
  );
}