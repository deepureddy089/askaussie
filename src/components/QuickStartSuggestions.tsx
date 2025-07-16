import { motion } from 'framer-motion';

interface QuickStartSuggestionsProps {
  isDark: boolean;
  setMessage: (msg: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

const suggestions = [
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
];

const QuickStartSuggestions = ({ isDark, setMessage, setSidebarOpen }: QuickStartSuggestionsProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
    {suggestions.map((suggestion, index) => (
      <motion.button
        key={index}
        onClick={() => {
          setMessage(suggestion.question);
          setSidebarOpen(false);
        }}
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
);

export default QuickStartSuggestions;