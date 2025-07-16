import { motion } from 'framer-motion';

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

export default LoadingDots;