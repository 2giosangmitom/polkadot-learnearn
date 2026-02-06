'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isCorrect?: boolean;
  rewardAmount?: number;
  signature?: string;
}

interface ChatInterfaceProps {
  walletAddress: string;
  currentModule: number;
  onRewardEarned: (amount: number, signature: string) => void;
}

export function ChatInterface({
  walletAddress,
  currentModule,
  onRewardEarned,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Welcome! Answer the question to earn rewards. 🎓',
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
    if (!input.trim() || loading) return;

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
        body: JSON.stringify({
          message: userMessage,
          context: {
            currentModule,
            walletAddress,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

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
          role: 'assistant',
          content: 'Error: Unable to process your answer. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border-2 border-border bg-card shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b-2 border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#e6007a]" />
          <h3 className="font-semibold text-primary">AI Learning Assistant</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Answer correctly to earn rewards via SMOL402
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-rose-50/20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-md transition-all hover:shadow-lg ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-[#e6007a] to-[#cc006c] text-white'
                  : msg.isCorrect
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-900 border-2 border-emerald-200'
                  : msg.isCorrect === false
                  ? 'bg-gradient-to-br from-red-50 to-rose-50 text-red-900 border-2 border-red-200'
                  : 'bg-white text-foreground border-2 border-border'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.rewardAmount && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <span className="text-base">🎉</span>
                    Earned: {msg.rewardAmount} PAS
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border-2 border-border rounded-2xl px-5 py-3 shadow-md">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#e6007a] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#e6007a] rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-[#e6007a] rounded-full animate-bounce delay-200"></div>
                </div>
                <p className="text-sm text-muted-foreground">AI is thinking...</p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t-2 border-border bg-white px-6 py-4"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer here..."
            disabled={loading}
            className="flex-1 px-5 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:border-transparent placeholder:text-muted-foreground disabled:bg-muted disabled:opacity-60 bg-white transition-all text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-[#e6007a] to-[#cc006c] hover:from-[#cc006c] hover:to-[#b3005d] text-white px-8 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md hover:shadow-lg font-semibold"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
