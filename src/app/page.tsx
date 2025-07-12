'use client';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Semantic Search',
    desc: 'Find relevant constitutional sections instantly, even for complex legal queries.',
  },
  {
    title: 'GPT-Powered Answers',
    desc: 'Get clear, concise, and context-aware answers from OpenAI’s GPT, grounded in the Constitution.',
  },
  {
    title: 'Sleek Interface',
    desc: 'Enjoy a clean, intuitive legal research experience designed for speed and clarity. Nav test.',
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-black font-sans">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold mb-4"
        >
          AskAussie
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl font-medium text-gray-700 mb-6"
        >
          The AI-powered Australian Constitution Explorer
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="max-w-xl mb-8 text-gray-600"
        >
          Welcome to the future of legal research. AskAussie is your advanced, semantic search engine for the Australian Constitution. Powered by GPT and state-of-the-art embeddings, it brings instant, accurate answers to your constitutional questions.
        </motion.p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/chat')}
          className="px-6 py-3 text-lg font-semibold border border-black rounded-full hover:bg-black hover:text-white transition"
        >
          🚀 Try AskAussie
        </motion.button>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-12">
        <h3 className="text-3xl font-semibold text-center mb-10">Why AskAussie?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
              className="bg-white shadow-md rounded-xl p-6 border border-gray-200 transition"
            >
              <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
              <p className="text-gray-600">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white text-center py-16">
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-2xl font-bold mb-4 text-black"
        >
          What is AskAussie?
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto text-gray-700 text-lg leading-relaxed"
        >
          AskAussie is a next-gen legal assistant for Australia. It leverages AI and semantic search to help citizens, students, and lawyers explore the Constitution with ease. Whether you’re researching, learning, or just curious, AskAussie is your launchpad to legal clarity.
        </motion.p>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-6 text-sm text-gray-600 border-t border-gray-200">
        &copy; {new Date().getFullYear()} AskAussie — Powered by GPT + RAG
      </footer>
    </main>
  );
} 