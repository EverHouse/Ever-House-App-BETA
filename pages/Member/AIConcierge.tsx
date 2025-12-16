import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface Message {
  role: 'user' | 'model';
  text: string;
  grounding?: any[];
}

const CLUB_KNOWLEDGE = `
You are the AI Concierge for Even House, a private members club in Tustin, CA.
Your goal is to be helpful, sophisticated, and efficient.
(Context omitted for brevity - same as previous)
`;

const PRESET_QUERIES = [
  "What tee times are available?",
  "Upcoming wellness classes",
  "RSVP for upcoming events",
  "Order me a coffee",
  "Membership benefits"
];

const AIConcierge: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Welcome to Even House. I can assist with bay bookings, cafe orders, wellness appointments, or membership questions. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let model = 'gemini-3-pro-preview';
      let config: any = { systemInstruction: CLUB_KNOWLEDGE };
      let parts: any[] = [{ text: userMsg.text }];
      let tools: any[] = [{ googleSearch: {} }, { googleMaps: {} }];

      const result = await ai.models.generateContent({
        model,
        contents: { parts },
        config,
        ...(tools.length > 0 ? { tools } : {})
      });

      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: result.text || "I'm sorry, I couldn't generate a response.",
        grounding: groundingChunks
      }]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
           {messages.map((msg, idx) => (
             <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                <div className={`max-w-[85%] p-4 shadow-sm backdrop-blur-md border ${
                    msg.role === 'user' 
                    ? 'bg-accent border-accent text-brand-green rounded-2xl rounded-tr-sm shadow-glow' 
                    : 'bg-[#E7E7DC] border-white/20 text-brand-green rounded-2xl rounded-tl-sm shadow-glass'
                }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{msg.text}</p>
                    
                    {/* Grounding Sources */}
                    {msg.grounding && (
                        <div className="mt-3 pt-3 border-t border-black/10 flex flex-wrap gap-2">
                            {msg.grounding.map((chunk: any, i: number) => {
                                if (chunk.web?.uri) {
                                    return (
                                        <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] bg-black/5 px-2 py-1 rounded-full hover:bg-black/10 transition-colors truncate max-w-full text-current">
                                            <span className="material-symbols-outlined text-[10px]">public</span>
                                            {chunk.web.title}
                                        </a>
                                    )
                                }
                                return null;
                            })}
                        </div>
                    )}
                </div>
                <span className="text-[10px] text-white/40 mt-1.5 px-1 capitalize tracking-wide">
                    {msg.role === 'user' ? 'You' : 'Concierge'}
                </span>
             </div>
           ))}
           
           {/* Preset Queries */}
           {messages.length < 3 && !loading && (
             <div className="flex flex-col gap-2 mt-4">
               {PRESET_QUERIES.map((query, i) => (
                 <button 
                    key={i}
                    onClick={() => handleSend(query)}
                    className="text-left p-3.5 rounded-xl bg-white/5 border border-white/5 text-white/80 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-3 animate-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${i * 0.05}s` }}
                 >
                    <span className="material-symbols-outlined text-accent text-lg">chat_bubble_outline</span>
                    {query}
                 </button>
               ))}
             </div>
           )}

           {loading && (
             <div className="flex items-start">
                <div className="bg-[#E7E7DC] p-4 rounded-2xl rounded-tl-sm border border-white/10">
                    <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-brand-green/60 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-brand-green/60 rounded-full animate-bounce delay-75"></div>
                        <div className="w-1.5 h-1.5 bg-brand-green/60 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
             </div>
           )}
        </div>

        {/* Static Input Area */}
        <div className="p-4 bg-[#F2F2EC] border-t border-white/20">
            <div className="relative flex items-center bg-white rounded-2xl border border-black/5 shadow-inner p-1 focus-within:ring-2 focus-within:ring-accent transition-all">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask the concierge..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-brand-green placeholder:text-gray-400 px-4 h-12"
                    autoFocus
                />
                <button 
                    onClick={() => handleSend()}
                    disabled={!input || loading}
                    className="w-10 h-10 bg-brand-green text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-green/90 transition-colors flex items-center justify-center shadow-md mr-1"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default AIConcierge;