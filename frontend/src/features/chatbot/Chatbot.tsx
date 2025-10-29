import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../types';
import { sendMessageToBot } from '../../services/geminiService';
import { Button, Spinner } from '../../components/ui';
import { AnimatedWrapper } from '../../components/shared/AnimatedComponents';
import { LightBulbIcon } from '../../components/Icons';

export const Chatbot = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        const currentHistory = [...history, userMessage];
        setHistory(currentHistory);
        setInput('');
        setIsLoading(true);

        try {
            const stream = await sendMessageToBot(history, input);
            let modelResponse = '';
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: modelResponse }] };
                    return newHistory;
                });
            }
        } catch (error) {
            console.error(error);
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: "Sorry, I'm having trouble connecting right now." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md h-[70vh] max-h-[500px] z-50">
            <AnimatedWrapper className="bg-slate-800 rounded-lg shadow-2xl w-full h-full flex flex-col border border-slate-700">
                <header className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2"><LightBulbIcon className="w-5 h-5 text-yellow-400" /> AI Learning Assistant</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
                </header>
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-700'}`}>
                                <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={{__html: msg.parts[0].text.replace(/\n/g, '<br />')}}/>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-[80%] p-3 rounded-lg bg-slate-700">
                                <Spinner />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSend} className="p-4 border-t border-slate-700 flex gap-2">
                    <input 
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        className="flex-1 p-2 rounded-md bg-slate-700 border-slate-600 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Ask a question..."
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>Send</Button>
                </form>
            </AnimatedWrapper>
        </div>
    )
};
