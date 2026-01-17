import { useState, useRef, useEffect, useCallback } from 'react';
import { streamQA, isAIServiceAvailable } from '../../services/aiService';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: isAIServiceAvailable()
        ? "Hello! I'm connected to the AI service. Ask me anything!"
        : "AI service is not configured. Please set VITE_GRPC_SERVER_URL.",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const pendingBotMessageRef = useRef<{ id: string; timestamp: Date } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
      }
    };
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || isWaitingForResponse) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    const botMessageId = `bot-${Date.now()}`;
    const botTimestamp = new Date();

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsWaitingForResponse(true);
    setError(null);

    // Store pending bot message info - don't add to messages yet
    pendingBotMessageRef.current = { id: botMessageId, timestamp: botTimestamp };

    // Start the streaming gRPC call
    cancelStreamRef.current = streamQA(userMessage.content, {
      onChunk: (answer) => {
        setMessages((prev) => {
          // Check if bot message already exists
          const existingMessage = prev.find((msg) => msg.id === botMessageId);
          
          if (existingMessage) {
            // Append to existing message
            return prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, content: msg.content + answer }
                : msg
            );
          } else {
            // First chunk - create the bot message now
            return [
              ...prev,
              {
                id: botMessageId,
                content: answer,
                sender: 'bot' as const,
                timestamp: botTimestamp,
              },
            ];
          }
        });
      },
      onComplete: () => {
        setIsWaitingForResponse(false);
        pendingBotMessageRef.current = null;
        cancelStreamRef.current = null;
      },
      onError: (err) => {
        setIsWaitingForResponse(false);
        setError(err.message);
        pendingBotMessageRef.current = null;
        cancelStreamRef.current = null;
        // Add error message as bot response
        setMessages((prev) => [
          ...prev,
          {
            id: botMessageId,
            content: `Error: ${err.message}`,
            sender: 'bot' as const,
            timestamp: botTimestamp,
          },
        ]);
      },
    });
  }, [inputValue, isWaitingForResponse]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-md">
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-sm text-gray-500">
              {isAIServiceAvailable() ? (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Connected
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Not configured
                </span>
              )}
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-br-md'
                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
              }`}
            >
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
              <p
                className={`text-xs mt-2 ${
                  message.sender === 'user' ? 'text-cyan-100' : 'text-gray-400'
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing Indicator - only show before first chunk arrives */}
        {isWaitingForResponse && pendingBotMessageRef.current && !messages.find(m => m.id === pendingBotMessageRef.current?.id) && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 shadow-sm">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isWaitingForResponse}
            className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-5 py-3 rounded-xl font-medium hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

