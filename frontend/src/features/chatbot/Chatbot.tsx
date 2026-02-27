import React, { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "../../types";
import { sendMessageToBot } from "../../services/geminiService";
import { Button, Spinner } from "../../components/ui";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { LightBulbIcon } from "../../components/Icons";

export const Chatbot = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", parts: [{ text: input }] };
    setHistory((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const stream = await sendMessageToBot(input);
      let modelResponse = "";
      let modelMessageAdded = false;

      for await (const chunk of stream) {
        modelResponse += chunk.text;
        if (!modelMessageAdded) {
          setHistory((prev) => [
            ...prev,
            { role: "model", parts: [{ text: modelResponse }] },
          ]);
          modelMessageAdded = true;
        } else {
          setHistory((prev) => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = {
              role: "model",
              parts: [{ text: modelResponse }],
            };
            return newHistory;
          });
        }
      }
    } catch (error) {
      console.error(error);
      setHistory((prev) => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "Sorry, I'm having trouble connecting right now." }],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-md h-[70vh] max-h-[500px] z-50">
      <AnimatedWrapper className="rounded-lg shadow-2xl w-full h-full flex flex-col border theme-transition" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
        <header className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-400" /> AI Learning
            Assistant
          </h3>
          <button onClick={onClose} className="hover:text-[var(--text)]" style={{ color: 'var(--text-muted)' }}>
            &times;
          </button>
        </header>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {history.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                }`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg theme-transition ${msg.role === "user"
                    ? "bg-[var(--accent)] text-white"
                    : ""
                  }`}
                style={msg.role !== "user" ? { background: 'var(--surface-3)', color: 'var(--text)' } : {}}
              >
                <div
                  className="prose prose-sm theme-transition"
                  style={{ color: 'inherit' }}
                  dangerouslySetInnerHTML={{
                    __html: msg.parts[0].text.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg theme-transition" style={{ background: 'var(--surface-3)' }}>
                <Spinner />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form
          onSubmit={handleSend}
          className="p-4 border-t flex gap-2 theme-transition"
          style={{ borderColor: 'var(--border)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 rounded-md border focus:ring-[var(--accent)] focus:border-[var(--accent)] theme-transition"
            style={{ background: 'var(--surface-3)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Ask a question..."
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </AnimatedWrapper>
    </div>
  );
};
