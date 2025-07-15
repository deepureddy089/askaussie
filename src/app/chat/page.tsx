'use client'; // This component runs on the client side

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown'; // Import the library
import remarkGfm from 'remark-gfm'; // Import the GFM plugin

// Loading dots animation for AI responses
const LoadingDots = () => (
  <div className="flex items-center space-x-1">
    <motion.span 
      className="w-1.5 h-1.5 bg-emerald-500 rounded-full" 
      animate={{ opacity: [0.4, 1, 0.4] }} 
      transition={{ repeat: Infinity, duration: 1, delay: 0 }} 
    />
    <motion.span 
      className="w-1.5 h-1.5 bg-emerald-500 rounded-full" 
      animate={{ opacity: [0.4, 1, 0.4] }} 
      transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} 
    />
    <motion.span 
      className="w-1.5 h-1.5 bg-emerald-500 rounded-full" 
      animate={{ opacity: [0.4, 1, 0.4] }} 
      transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} 
    />
  </div>
);

// Interface for a single chat message
interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

// Interface for a chat conversation
interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function ChatPage() {
  // State for managing all chats, the currently active chat, input message, and loading status
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for sidebar visibility - CLOSED BY DEFAULT
  const [pendingAssistantMessageId, setPendingAssistantMessageId] = useState<string | null>(null); // New state for pending message ID
  const [abortController, setAbortController] = useState<AbortController | null>(null); // State for controlling stream abort
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system'); // Theme state
  const [isDark, setIsDark] = useState(false); // Computed dark mode state

  // Refs for scrolling to the end of messages and for textarea auto-resize
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derive the current chat object based on currentChatId
  const currentChat = chats.find(chat => chat.id === currentChatId);

  // Effect to scroll to the bottom of the chat whenever messages change or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, isLoading]);

  // Effect to auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'; // Set to scroll height
    }
  }, [message]);

  // Effect to handle theme changes and system preference detection
  useEffect(() => {
    const savedTheme = localStorage.getItem('askaussie-theme') as 'light' | 'dark' | 'system' || 'system';
    setTheme(savedTheme);

    const updateTheme = () => {
      if (savedTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(systemPrefersDark);
        document.documentElement.classList.toggle('dark', systemPrefersDark);
      } else {
        const shouldBeDark = savedTheme === 'dark';
        setIsDark(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
      }
    };

    updateTheme();
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
    
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);

  // Function to toggle theme
  const toggleTheme = () => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem('askaussie-theme', nextTheme);
  };

  // Effect to load chats from localStorage on component mount
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem('askaussie-chats');
      if (savedChats) {
        // Parse saved chats and convert date strings back to Date objects
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
        // Set the current chat to the first one if any chats are loaded
        if (parsedChats.length > 0) setCurrentChatId(parsedChats[0].id);
      }
    } catch (error) {
      console.error('Error loading chats from localStorage:', error);
      // Clear corrupted data if parsing fails
      localStorage.removeItem('askaussie-chats');
      setChats([]);
      setCurrentChatId(null);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Function to save updated chats to localStorage and update state
  const saveChats = (updatedChats: Chat[]) => {
    try {
      localStorage.setItem('askaussie-chats', JSON.stringify(updatedChats));
      setChats(updatedChats);
    } catch (error) {
      console.error('Error saving chats to localStorage:', error);
      // Handle quota exceeded or other storage errors
      alert('Failed to save chat history. Local storage might be full.');
    }
  };

  // Function to create a new chat conversation
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(), // Unique ID for the chat
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updatedChats = [newChat, ...chats]; // Add new chat to the beginning
    saveChats(updatedChats);
    setCurrentChatId(newChat.id); // Set the new chat as current
  };

  // Function to delete a chat conversation
  const deleteChat = (chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    saveChats(updatedChats);
    // If the deleted chat was the current one, switch to the first remaining chat or null
    if (currentChatId === chatId) {
      setCurrentChatId(updatedChats.length > 0 ? updatedChats[0].id : null);
    }
  };

  // Function to stop the current streaming
  const stopStreaming = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setPendingAssistantMessageId(null);
    }
  };

  // Function to send a message to the AI API
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return; // Prevent sending empty messages or while loading

    let targetChatId = currentChatId;
    // If no chat is currently selected, create a new one
    if (!targetChatId) {
      const newChat: Chat = {
        id: Date.now().toString(),
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''), // Title from first message
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const updatedChats = [newChat, ...chats];
      saveChats(updatedChats);
      targetChatId = newChat.id;
      setCurrentChatId(targetChatId);
    }

    // Create the user message object
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };

    // Ensure `currentChats` is correctly initialized before updating
    // This handles the case where `chats` might be empty initially but a new chat is created
    const currentChatsList = chats.find(c => c.id === targetChatId) ? chats : [
      {
        id: targetChatId,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      ...chats
    ];


    // Add the user message to the appropriate chat
    const updatedChatsWithUserMessage = currentChatsList.map(chat =>
      chat.id === targetChatId
        ? {
            ...chat,
            messages: [...chat.messages, userMessage],
            // Update title if it's a new chat (first message)
            title: chat.messages.length === 0 ? message.slice(0, 50) + (message.length > 50 ? '...' : '') : chat.title,
            updatedAt: new Date()
          }
        : chat
    );

    saveChats(updatedChatsWithUserMessage); // Save chats with the new user message
    setMessage(''); // Clear the input field
    setIsLoading(true); // Set loading state

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Add a placeholder for the assistant's response to show immediate feedback
    const newAssistantMessageId = (Date.now() + 1).toString(); // Generate ID here
    setPendingAssistantMessageId(newAssistantMessageId); // Store it in state

    const assistantMessagePlaceholder: Message = {
      id: newAssistantMessageId,
      content: '', // Empty content will be filled by stream
      role: 'assistant',
      timestamp: new Date()
    };

    // Optimistically add the assistant placeholder to the UI
    setChats(prevChats => prevChats.map(chat =>
      chat.id === targetChatId
        ? { ...chat, messages: [...chat.messages, assistantMessagePlaceholder] }
        : chat
    ));

    try {
      // Prepare chat history for the API call (excluding the current user message, as the API adds it)
      // The API expects `messages` to be the full history including the latest user message
      const chatHistoryForApi = updatedChatsWithUserMessage.find(c => c.id === targetChatId)?.messages || [];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistoryForApi // Send the full history including the latest user message
        }),
        signal: controller.signal // Add abort signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is empty.");
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = ''; // Buffer to accumulate partial lines from the stream
      let fullResponse = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last (potentially incomplete) line in buffer

        for (const line of lines) {
          if (line.startsWith('0:')) { // This is a text chunk from the AI SDK stream
            try {
              // Parse the JSON string part, e.g., "Hello" from 0:"Hello"
              const textChunk = JSON.parse(line.substring(2));
              fullResponse += textChunk;
            } catch (parseError) {
              console.error('Error parsing text chunk from stream:', parseError, 'Line:', line);
            }
          }
          // 'f:', 'e:', 'd:' lines are for metadata/tool calls and can be ignored for simple text display
        }

        // Update the assistant's message content as chunks arrive
        setChats(currentChats =>
          currentChats.map(chat =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === newAssistantMessageId // Use the state variable here
                      ? { ...msg, content: fullResponse } // REMOVED stripMarkdown call
                      : msg
                  ),
                }
              : chat
          )
        );
      }

      // Final save after streaming is complete to update timestamp and ensure persistence
      setChats(currentChats => {
        const finalChats = currentChats.map(chat =>
          chat.id === targetChatId
            ? {
                ...chat,
                updatedAt: new Date()
              }
            : chat
        );
        try {
          localStorage.setItem('askaussie-chats', JSON.stringify(finalChats));
        } catch (error) {
          console.error('Error saving final chats:', error);
        }
        return finalChats;
      });


    } catch (error) {
      // Check if the error is due to abort signal
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        // Remove the incomplete assistant message
        setChats(currentChats => {
          const updatedChats = currentChats.map(chat =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.filter(msg => msg.id !== newAssistantMessageId),
                  updatedAt: new Date()
                }
              : chat
          );
          try {
            localStorage.setItem('askaussie-chats', JSON.stringify(updatedChats));
          } catch (storageError) {
            console.error('Error saving chats after abort:', storageError);
          }
          return updatedChats;
        });
      } else {
        console.error('Error sending message:', error);
        const errorMessageContent = error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.';
        // Update the assistant's placeholder message with the error
        setChats(currentChats => {
          const errorChats = currentChats.map(chat =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === newAssistantMessageId // Use the state variable here
                      ? { ...msg, content: `Error: ${errorMessageContent}` } // Show error in assistant bubble
                      : msg
                  ),
                  updatedAt: new Date()
                }
              : chat
          );
          try {
            localStorage.setItem('askaussie-chats', JSON.stringify(errorChats));
          } catch (error) {
            console.error('Error saving chats after error:', error);
          }
          return errorChats;
        });
      }
    } finally {
      setIsLoading(false); // Always stop loading regardless of success or failure
      setPendingAssistantMessageId(null); // Clear pending message ID
      setAbortController(null); // Clear abort controller
    }
  };

  // Enhanced search function that searches through chat titles and message content
  const filteredChats = chats.filter(chat => {
    const searchLower = searchTerm.toLowerCase();
    
    // Search in chat title
    if (chat.title.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in message content
    return chat.messages.some(message => 
      message.content.toLowerCase().includes(searchLower)
    );
  });
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default new line behavior
      sendMessage();
    }
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 text-black'
    }`}>
      {/* Collapsible Left Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`w-80 border-r flex flex-col shadow-xl z-10 ${
              isDark 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Header Section - No duplicate logo when sidebar is open */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={createNewChat}
                className={`w-full px-4 py-3 rounded-xl transition-all flex items-center justify-center font-medium ${
                  isDark 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-black hover:bg-gray-800 text-white'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Chat
              </button>
            </div>

            {/* Chat History Section */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className={`text-xs font-medium uppercase tracking-wide px-3 py-2 mb-2 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Chat History ({chats.length})
              </div>

              {/* Enhanced Search Section */}
              <div className={`p-3 mb-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conversations & messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-3 py-2 pl-9 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20' 
                        : 'bg-gray-50 border-gray-200 focus:border-emerald-400 focus:ring-emerald-100'
                    }`}
                  />
                  <svg className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Results counter */}
                {searchTerm && (
                  <div className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {filteredChats.length} result{filteredChats.length !== 1 ? 's' : ''} found
                  </div>
                )}
              </div>

              {chats.length === 0 ? (
                <div className={`text-center text-sm py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-3xl mb-2">💬</div>
                  No conversations yet
                </div>
              ) : filteredChats.length === 0 ? (
                <div className={`text-center text-sm py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="text-3xl mb-2">🔍</div>
                  No matches found
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <motion.div
                    key={chat.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setCurrentChatId(chat.id)}
                    className={`p-3 rounded-xl mb-2 cursor-pointer transition-all group relative ${
                      currentChatId === chat.id
                        ? isDark 
                          ? 'bg-emerald-900/30 border border-emerald-700' 
                          : 'bg-emerald-50 border border-emerald-300'
                        : isDark 
                          ? 'hover:bg-gray-700' 
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className={`font-medium text-sm truncate ${
                      currentChatId === chat.id 
                        ? isDark ? 'text-emerald-300' : 'text-emerald-700'
                        : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {chat.title}
                    </div>
                    <div className={`text-xs mt-1 ${
                      isDark ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {chat.messages.length} messages • {new Date(chat.updatedAt).toLocaleDateString()}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        isDark ? 'hover:bg-red-900/30' : 'hover:bg-red-100'
                      }`}
                      aria-label={`Delete chat ${chat.title}`}
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer with theme info */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Constitutional AI Assistant
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Elite Header with Theme Toggle */}
        <div className={`h-16 border-b flex items-center px-6 backdrop-blur-lg transition-colors ${
          isDark 
            ? 'bg-gray-800/80 border-gray-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center gap-4">
            {/* Smart Toggle Button */}
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              aria-label="Toggle sidebar"
            >
              <motion.div
                initial={false}
                animate={sidebarOpen ? { rotate: 0 } : { rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                {sidebarOpen ? (
                  <svg className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                ) : (
                  <svg className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
            
            {/* Brand Identity - Only show when sidebar is closed */}
            {!sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="text-2xl">⚖️</div>
                <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  AskAussie
                </h1>
              </div>
            )}
          </div>
          
          {/* Right side controls */}
          <div className="ml-auto flex items-center gap-3">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : theme === 'dark' ? (
                <svg className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </motion.button>
            
            {/* Status indicator */}
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentChat ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  {currentChat.messages.length} messages
                </span>
              ) : (
                'Ready to help with constitutional law'
              )}
            </div>
          </div>
        </div>

        {/* Elite Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentChat || currentChat.messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-2xl mx-auto">
                <div className="text-8xl mb-6">⚖️</div>
                <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Welcome to AskAussie
                </h2>
                <p className={`text-lg mb-8 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Your elite constitutional AI assistant. Get expert insights on Australian constitutional law, 
                  government powers, rights and freedoms, or specific constitutional provisions.
                </p>
                
                {/* Elite Quick Start Suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {[
                    { 
                      title: "Legislative Powers", 
                      question: "What are the main powers of the Australian Parliament under Section 51?",
                      icon: "🏛️"
                    },
                    { 
                      title: "Rights & Freedoms", 
                      question: "What rights and freedoms are protected in the Australian Constitution?",
                      icon: "🛡️"
                    },
                    { 
                      title: "Federal Structure", 
                      question: "How does the Constitution divide power between federal and state governments?",
                      icon: "🌏"
                    },
                    { 
                      title: "Constitutional Interpretation", 
                      question: "How do courts interpret the Australian Constitution?",
                      icon: "⚖️"
                    }
                  ].map((suggestion, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setMessage(suggestion.question)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 text-left border rounded-xl transition-all group ${
                        isDark 
                          ? 'border-gray-700 hover:border-emerald-500 hover:bg-gray-800/50' 
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{suggestion.icon}</span>
                        <h3 className={`font-medium ${
                          isDark 
                            ? 'text-white group-hover:text-emerald-300' 
                            : 'text-gray-900 group-hover:text-emerald-700'
                        }`}>
                          {suggestion.title}
                        </h3>
                      </div>
                      <p className={`text-sm ${
                        isDark 
                          ? 'text-gray-400 group-hover:text-emerald-400' 
                          : 'text-gray-600 group-hover:text-emerald-600'
                      }`}>
                        {suggestion.question}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              {currentChat.messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                  className="w-full"
                >
                  {msg.role === 'user' && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          You
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`ml-11 leading-relaxed whitespace-pre-line ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        {msg.content}
                      </div>
                    </div>
                  )}
                  
                  {msg.role === 'assistant' && (
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                          <span className="text-white text-sm font-medium">⚖️</span>
                        </div>
                        <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          AskAussie
                        </span>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="ml-11">
                        <div className={`prose max-w-none leading-relaxed ${
                          isDark ? 'prose-invert text-gray-200' : 'prose-gray text-gray-800'
                        }`}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              hr: () => null,
                              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                              h1: ({ children }) => <h1 className={`text-xl font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h1>,
                              h2: ({ children }) => <h2 className={`text-lg font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h2>,
                              h3: ({ children }) => <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h3>,
                              ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className={isDark ? 'text-gray-200' : 'text-gray-800'}>{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className={`border-l-4 border-emerald-500 pl-4 italic mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {children}
                                </blockquote>
                              ),
                              code: ({ children }) => (
                                <code className={`px-2 py-1 rounded text-sm font-mono ${
                                  isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className={`p-4 rounded-lg overflow-x-auto mb-4 ${
                                  isDark ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                  {children}
                                </pre>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                          {/* Enhanced loading indicator */}
                          {isLoading && msg.id === pendingAssistantMessageId && msg.content === '' && (
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${
                              isDark ? 'bg-gray-800/50' : 'bg-gray-50'
                            }`}>
                              <LoadingDots />
                              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Analyzing constitutional provisions...
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {/* Enhanced loading indicator for new messages */}
              {isLoading && currentChat.messages[currentChat.messages.length - 1]?.role === 'user' && !pendingAssistantMessageId && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <span className="text-white text-sm font-medium">⚖️</span>
                    </div>
                    <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      AskAussie
                    </span>
                  </div>
                  <div className={`ml-11 flex items-center gap-3 p-3 rounded-lg ${
                    isDark ? 'bg-gray-800/50' : 'bg-gray-50'
                  }`}>
                    <LoadingDots />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Researching constitutional law...
                    </span>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Elite Input Area */}
        <div className={`border-t p-6 backdrop-blur-lg transition-colors ${
          isDark 
            ? 'bg-gray-800/80 border-gray-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about the Australian Constitution..."
                className={`w-full p-4 pr-16 border rounded-2xl resize-none focus:outline-none focus:ring-2 transition-all min-h-[60px] max-h-40 text-base shadow-lg ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-emerald-500 focus:ring-emerald-500/20' 
                    : 'bg-white border-gray-200 focus:border-emerald-400 focus:ring-emerald-100'
                }`}
                rows={1}
                disabled={isLoading}
                style={{ resize: 'none' }}
              />
              {isLoading ? (
                <motion.button
                  onClick={stopStreaming}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  className="absolute right-3 bottom-3 bg-red-500 text-white rounded-xl p-2 flex items-center justify-center shadow-lg hover:bg-red-600 transition-all group"
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Stop"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </motion.button>
              ) : (
                <motion.button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: message.trim() ? 1.05 : 1 }}
                  className={`absolute right-3 bottom-3 rounded-xl p-2 flex items-center justify-center shadow-lg transition-all group ${
                    message.trim() 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : isDark 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  style={{ width: '44px', height: '44px' }}
                  aria-label="Send"
                >
                  <svg className={`w-5 h-5 transition-transform ${message.trim() ? 'group-hover:scale-110 group-hover:translate-x-0.5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              )}
            </div>
            
            {/* Enhanced status bar */}
            <div className={`text-xs mt-3 flex items-center justify-between ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <LoadingDots />
                    <span>Processing constitutional query</span>
                    <span>•</span>
                    <button 
                      onClick={stopStreaming}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      Click to stop
                    </button>
                  </span>
                ) : (
                  <span>Press Enter to send • Shift+Enter for new line</span>
                )}
              </div>
              
              {/* Character count and theme indicator */}
              <div className="flex items-center gap-3">
                {message && (
                  <span className={`text-xs ${message.length > 1000 ? 'text-orange-500' : ''}`}>
                    {message.length} chars
                  </span>
                )}
                <span className="capitalize text-xs">
                  {theme} mode
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}