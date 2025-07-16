import { motion } from 'framer-motion';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDark: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  currentChat: { messages: { id: string }[] } | null;
}

const Header = ({
  sidebarOpen,
  setSidebarOpen,
  isDark,
  theme,
  toggleTheme,
  currentChat
}: HeaderProps) => (
  <div className={`h-16 border-b flex items-center px-4 md:px-6 backdrop-blur-lg transition-colors ${
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
      
      {/* Brand Identity */}
      <div className="hidden md:flex items-center gap-2">
        <div className="text-2xl">⚖️</div>
        <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
          AskAussie
        </h1>
      </div>
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
);

export default Header;