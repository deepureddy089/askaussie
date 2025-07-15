'use client'; // This component runs on the client side

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm for GitHub Flavored Markdown

// Removed stripMarkdown utility function as we will now render Markdown directly.

// Icon for User messages
const UserIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path stroke="currentColor" strokeWidth="2" d="M4 20c0-2.5 3.5-4 8-4s8 1.5 8 4" />
  </svg>
);

// Icon for AI messages
const AiIcon = () => (
  <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Loading dots animation for AI responses
const LoadingDots = () => (
  <div className="flex items-center space-x-1">
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} />
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
    <motion.span className="w-2 h-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
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
          // If you want to display tool call logic, you would parse '2:' lines here.
          // Example:
          // else if (line.startsWith('2:')) {
          //   try {
          //     const toolCallData = JSON.parse(line.substring(2));
          //     console.log("Tool call data received:", toolCallData);
          //     // You would update a state here to display this structured logic
          //   } catch (parseError) {
          //     console.error('Error parsing tool call data from stream:', parseError, 'Line:', line);
          //   }
          // }
        }

        // Update the assistant's message content as chunks arrive
        setChats(currentChats =>
          currentChats.map(chat =>
            chat.id === targetChatId
              ? {
                  ...chat,
                  messages: chat.messages.map(msg =>
                    msg.id === newAssistantMessageId // Use the state variable here
                      ? { ...msg, content: fullResponse } // No stripMarkdown here
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
    } finally {
      setIsLoading(false); // Always stop loading regardless of success or failure
      setPendingAssistantMessageId(null); // Clear pending message ID
    }
  };

  // Handle Enter key press for sending messages (Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default new line behavior
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
            className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg z-10" // Added z-10 for layering
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
                      e.stopPropagation(); // Prevent selecting chat when deleting
                      deleteChat(chat.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                    aria-label={`Delete chat ${chat.title}`}
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
                      <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-md max-w-[70vw] text-black text-base"> {/* Removed whitespace-pre-line to allow Markdown rendering */}
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-1" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-bold mt-2 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-1" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-1" {...props} />,
                            li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                            hr: ({node, ...props}) => <hr className="my-4 border-gray-300" {...props} />, // Style horizontal rules if they appear
                            strong: ({node, ...props}) => <strong className="font-extrabold" {...props} />, // Ensure strong is extra bold
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {/* Show loading dots only if it's the current pending assistant message and content is empty */}
                        {isLoading && msg.id === pendingAssistantMessageId && msg.content === '' && <LoadingDots />}
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
              {/* Show loading dots for a new assistant message if user just sent one and it's loading,
                  and no assistant placeholder has been fully rendered yet */}
              {isLoading && currentChat.messages[currentChat.messages.length - 1]?.role === 'user' && !pendingAssistantMessageId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-end justify-start gap-2"
                >
                  <div className="bg-gray-200 rounded-full p-2 shadow">
                    <AiIcon />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-md flex items-center">
                    <LoadingDots />
                  </div>
                </motion.div>
              )}
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
