import { motion, AnimatePresence } from 'framer-motion';
// import { Chat } from '@/components/Chat'; // Adjust the path if needed
// Define Chat interface here if not imported from elsewhere
export interface Chat {
  id: string;
  title: string;
  messages: { id: string; content: string }[];
  updatedAt: string | number | Date;
}

interface SidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  createNewChat: () => void;
  deleteChat: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredChats: Chat[];
  isDark: boolean;
}

const Sidebar = ({
  chats,
  currentChatId,
  setCurrentChatId,
  createNewChat,
  deleteChat,
  sidebarOpen,
  setSidebarOpen,
  searchTerm,
  setSearchTerm,
  filteredChats,
  isDark
}: SidebarProps) => (
  <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`fixed inset-y-0 left-0 w-80 border-r flex flex-col shadow-xl z-20 md:relative md:w-80 ${
              isDark 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
          >
            {/* Header Section - No duplicate logo when sidebar is open */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  createNewChat();
                  setSidebarOpen(false); // Close sidebar on new chat for mobile
                }}
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
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      setSidebarOpen(false); // Close sidebar on chat selection for mobile
                    }}
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
);

export default Sidebar;