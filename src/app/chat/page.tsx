'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Utility to strip markdown from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s?/gm, '') // Remove headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italics
    .replace(/`([^`]*)`/g, '$1') // Remove inline code
    .replace(/^- /gm, '') // Remove list dashes
    .replace(/^\d+\.\s?/gm, '') // Remove numbered lists
    .replace(/>\s?/gm, '') // Remove blockquotes
    .replace(/\n{2,}/g, '\n\n') // Normalize newlines
    .trim();
}

const UserIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path stroke="currentColor" strokeWidth="2" d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
  </svg>
);

const AiIcon = () => (
  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const LoadingDots = () => (
  <div className="flex items-center space-x-1">
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
  </div>
);

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentChat = chats.find(chat => chat.id === currentChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('askaussie-chats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats).map((chat: Chat) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChats(parsedChats);
        if (parsedChats.length > 0) setCurrentChatId(parsedChats[0].id);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, []);

  const saveChats = (updatedChats: Chat[]) => {
    try {
      localStorage.setItem('askaussie-chats', JSON.stringify(updatedChats));
      setChats(updatedChats);
    } catch (error) {
      console.error('Error saving chats:', error);
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updatedChats = [newChat, ...chats];
    saveChats(updatedChats);
    setCurrentChatId(newChat.id);
  };

  const deleteChat = (chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    saveChats(updatedChats);
    if (currentChatId === chatId) {
      setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    let targetChatId = currentChatId;
    if (!targetChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const updatedChats = [newChat, ...chats];
      saveChats(updatedChats);
      targetChatId = newChat.id;
      setCurrentChatId(targetChatId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    const currentChats = chats.find(c => c.id === targetChatId) ? chats : [
      {
        id: targetChatId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      ...chats
    ];

    const updatedChats = currentChats.map(chat =>
      chat.id === targetChatId
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            title: chat.messages.length === 0 ? message.slice(0, 50) + (message.length > 50 ? '...' : '') : chat.title,
            updatedAt: new Date()
          }
        : chat
    );

    saveChats(updatedChats);
    setMessage('');
    setIsLoading(true);

    // Streaming logic
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          chatHistory: updatedChats.find(c => c.id === targetChatId)?.messages || []
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      let aiText = '';
      const decoder = new TextDecoder();

      // Add a temporary assistant message for streaming
      setChats(currentChats => {
        return currentChats.map(chat =>
          chat.id === targetChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: (Date.now() + 1).toString(),
                    content: '',
                    role: 'assistant',
                    timestamp: new Date()
                  }
                ],
                updatedAt: new Date()
              }
            : chat
        );
      });

      // Stream the response and update the last assistant message
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value);

        setChats(currentChats => {
          return currentChats.map(chat =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg, idx, arr) =>
                    idx === arr.length - 1 && msg.role === 'assistant'
                      ? { ...msg, content: aiText }
                      : msg
                  ),
                  updatedAt: new Date()
                }
              : chat
          );
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      };
      setChats(currentChats => {
        const errorChats = currentChats.map(chat =>
          chat.id === targetChatId
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
                updatedAt: new Date()
              }
            : chat
        );
        try {
          localStorage.setItem('askaussie-chats', JSON.stringify(errorChats));
        } catch (error) {
          console.error('Error saving chats:', error);
        }
        return errorChats;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-black">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ duration: 0.3 }}
            className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg"
          >
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={createNewChat}
                className="w-full px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center font-medium"
              >
                <span className="mr-2 text-lg">+</span>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chats.map((chat) => (
                <motion.div
                  key={chat.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setCurrentChatId(chat.id)}
                  className={`p-3 rounded-xl mb-2 cursor-pointer transition-colors group relative ${
                    currentChatId === chat.id
                      ? 'bg-gray-200 border border-gray-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {chat.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {chat.messages.length} messages
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                  >
                    <span className="text-red-500 text-xs">×</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-gray-200 flex items-center px-6 bg-white/80 backdrop-blur-lg">
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            whileTap={{ scale: 0.9 }}
            className="p-2 hover:bg-gray-100 rounded-lg mr-4 transition-all"
            aria-label="Toggle sidebar"
          >
            <motion.div
              initial={false}
              animate={sidebarOpen ? { rotate: 90 } : { rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <rect x="4" y="7" width="16" height="2" rx="1" fill="currentColor" />
                <rect x="4" y="11" width="16" height="2" rx="1" fill="currentColor" />
                <rect x="4" y="15" width="16" height="2" rx="1" fill="currentColor" />
              </svg>
            </motion.div>
          </motion.button>
          <h1 className="text-xl font-bold tracking-tight">AskAussie</h1>
          <div className="ml-auto text-sm text-gray-500">
            Constitutional AI Assistant
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">⚖️</div>
                <h2 className="text-2xl font-bold mb-2">Welcome to AskAussie</h2>
                <p className="text-gray-600 max-w-md">
                  Ask me anything about the Australian Constitution. I can help you understand 
                  constitutional law, find specific sections, and explain complex legal concepts.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {currentChat.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-end gap-2">
                      <div className="bg-gray-200 rounded-full p-2 shadow">
                        <AiIcon />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-md max-w-[70vw] text-black text-base whitespace-pre-line">
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {msg.role === 'user' && (
                    <div className="flex items-end gap-2 flex-row-reverse">
                      <div className="bg-black rounded-full p-2 shadow">
                        <UserIcon />
                      </div>
                      <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-md max-w-[70vw] text-base whitespace-pre-line">
                        {msg.content}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-6 bg-white/80 backdrop-blur-lg">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about the Australian Constitution..."
                className="w-full p-4 pr-16 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:border-black transition-colors min-h-[48px] max-h-40 text-base bg-gray-50 overflow-hidden"
                rows={1}
                disabled={isLoading}
                style={{ resize: 'none' }}
              />
              <motion.button
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                whileTap={{ scale: 0.95 }}
                className="absolute right-3 bottom-3 bg-black text-white rounded-xl px-5 py-2 flex items-center justify-center shadow-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                style={{ height: '40px', minWidth: '40px' }}
                aria-label="Send"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 12l14-7-7 14-2-5-5-2z" />
                </svg>
              </motion.button>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}