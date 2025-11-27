import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const Success: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-darkbg text-center p-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 10 }}
        className="mb-8"
      >
        <div className="w-32 h-32 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto animate-bounce-slow">
            <CheckCircle className="w-20 h-20 text-green-500" strokeWidth={3} />
        </div>
      </motion.div>
      
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
      >
        Paldies!
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-xl text-gray-500 dark:text-gray-400 max-w-md"
      >
        Aptauja veiksmīgi iesniegta. Dati ir saglabāti anonīmi.
      </motion.p>
    </div>
  );
};