import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Loader2, Languages, Sparkles, Cpu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const LANGUAGES = [
  { code: 'english', label: 'English' },
  { code: 'tamil', label: 'தமிழ் (Tamil)' },
  { code: 'hindi', label: 'हिन्दी (Hindi)' },
  { code: 'kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'telugu', label: 'తెలుగు (Telugu)' },
  { code: 'malayalam', label: 'മലയാളം (Malayalam)' },
];

const QUICK_PROMPTS = [
  'Find equipment for ploughing',
  'Show available equipment',
  'Check my booking',
  'What does BEST / USABLE / NOT RECOMMENDED mean?',
  'How does payment work?',
];

const FarmerAssistant = () => {
  const { user } = useAuth();
  const [language, setLanguage] = useState('english');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || isTyping) return;

    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const res = await api.post('/chatbot/message', { message: text, language });
      if (res.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.reply,
            mode: res.data.mode,
            language: res.data.language,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.message || 'The assistant was unable to respond. Please try again.',
            mode: 'error',
          },
        ]);
      }
    } catch (err) {
      console.error('Chatbot error:', err);
      setError(err.response?.data?.message || 'Failed to reach the assistant. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">

        {/* Header */}
        <div className="hero-banner p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 bg-white/10 text-forest-100 text-xs font-semibold px-3 py-1 rounded-full border border-white/15">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multilingual Farmer Assistant</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">How can I help your farm today?</h1>
              <p className="text-forest-200 text-sm max-w-xl">
                Ask about equipment availability, prices, booking steps, weather slots, payments, and maintenance. Answers are grounded in your live platform data.
              </p>
            </div>

            {/* Language Selector */}
            <div className="bg-white/10 border border-white/15 rounded-2xl p-3 shrink-0">
              <label className="flex items-center space-x-1.5 text-[11px] uppercase font-bold tracking-wider text-forest-200 mb-2">
                <Languages className="w-3.5 h-3.5" />
                <span>Assistant Language</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white text-stone-900 text-sm font-semibold rounded-xl px-3 py-2 w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chat Card */}
        <div className="card overflow-hidden flex flex-col h-[480px]">

          {/* Chat Scroll Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-cream-50">
            {messages.length === 0 && (
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 mx-auto bg-forest-50 text-forest-600 rounded-3xl flex items-center justify-center">
                  <Bot className="w-9 h-9" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-800 text-lg">Hello, {user?.name || 'farmer'}!</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    I can answer questions about the equipment catalog, rental prices, booking steps, weather slot meanings (BEST / USABLE / NOT RECOMMENDED), payments, and maintenance — using live data from your account.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 px-4">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="bg-white border border-forest-200 text-forest-700 hover:bg-forest-50 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-forest-600 text-white rounded-br-md'
                      : 'bg-white border border-stone-200 rounded-bl-md text-stone-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === 'assistant' && m.mode && (
                    <span
                      className={`inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider mt-2 px-2 py-0.5 rounded-full ${
                        m.mode === 'gemini'
                          ? 'bg-purple-100 text-purple-700'
                          : m.mode === 'rule-based'
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {m.mode === 'gemini' ? <Sparkles className="w-3 h-3" /> : m.mode === 'rule-based' ? <Cpu className="w-3 h-3" /> : null}
                      <span>{m.mode === 'gemini' ? 'AI assistant' : m.mode === 'rule-based' ? 'Offline knowledge base' : 'Error'}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center space-x-2 shadow-sm">
                  <Loader2 className="w-4 h-4 text-forest-600 animate-spin" />
                  <span className="text-xs text-stone-500 font-medium">Assistant is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div role="alert" className="alert-error rounded-none border-x-0 border-b-0 p-3 text-xs">
              <span>{error}</span>
              <button onClick={() => setError(null)} aria-label="Dismiss message" className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-stone-200 bg-white flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask in ${LANGUAGES.find((l) => l.code === language)?.label || 'English'}...`}
              className="input flex-1"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              aria-label="Send message"
              className="btn-primary px-3 py-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>

        {/* Grounding Disclaimer */}
        <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 text-center text-[11px] text-stone-600">
          The assistant only answers using your live platform data — it never invents equipment, availability, prices, bookings, or weather. If you have a non-platform question, it will say so.
        </div>

      </div>
    </div>
  );
};

export default FarmerAssistant;
