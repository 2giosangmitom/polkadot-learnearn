// learnearn-nextjs/components/ChatInterface.tsx

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isCorrect?:  boolean;
  rewardAmount?: number;
  signature?: string;
}

interface ChatInterfaceProps {
  walletAddress: string;
  currentModule: number;
  onRewardEarned: (amount: number, signature: string) => void;
}

export default function ChatInterface({
  walletAddress,
  currentModule,
  onRewardEarned,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome!  Answer the question to earn rewards.  🎓',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (! input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Call backend API
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:  JSON.stringify({
          message: userMessage,
          context: {
            currentModule,
            walletAddress,
          },
        }),
      });

      const data = await response.json();

      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          isCorrect: data.isCorrect,
          rewardAmount: data.rewardAmount,
          signature: data.signature,
        },
      ]);

      // Notify parent if reward earned
      if (data.isCorrect && data.rewardAmount && data.signature) {
        onRewardEarned(data.rewardAmount, data.signature);
      }
    } catch (error) {
      console.error('❌ Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role:  'assistant',
          content:  'Error:  Unable to process your answer. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50 via-white to-rose-100 shadow-lg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[#e6007a] text-white'
                  : msg.isCorrect
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                  : msg.isCorrect === false
                  ? 'bg-rose-100 text-rose-900 border border-rose-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-100'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
              {msg.rewardAmount && (
                <p
                  className={`text-xs mt-2 font-semibold ${
                    msg.role === 'user' ? 'text-white/90' : 'text-rose-700'
                  }`}
                >
                  🎉 Earned: {msg.rewardAmount} WND
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 shadow-sm">
              <p className="text-sm text-rose-700">AI is thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-rose-100 bg-white/70 backdrop-blur-sm p-4 rounded-b-2xl">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 placeholder:text-rose-300 disabled:bg-rose-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-[#e6007a] hover:bg-[#cc006c] text-white px-6 py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}