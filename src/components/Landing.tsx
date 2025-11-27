import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, Activity } from 'lucide-react';
import { DeviceType } from '../types';

interface LandingProps {
  onSelectDevice: (type: DeviceType) => void;
}

export const Landing: React.FC<LandingProps> = ({ onSelectDevice }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-science-50 to-white dark:from-darkbg dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-science-100 dark:bg-science-900 rounded-full">
            <Activity className="w-12 h-12 text-science-600 dark:text-science-300" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4 tracking-tight">
          Imūnās sistēmas pētījums
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Tavs viedoklis ir svarīgs! Palīdzi mums izprast saikni starp uzturu, sportu un veselību.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectDevice(DeviceType.MOBILE)}
          className="group relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-science-400 flex flex-col items-center"
        >
          <Smartphone className="w-16 h-16 text-science-500 mb-4 group-hover:text-science-600 transition-colors" />
          <span className="text-xl font-semibold text-gray-700 dark:text-gray-200">Mobilā versija</span>
          <span className="text-sm text-gray-400 mt-2">Ērta, soli pa solim</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectDevice(DeviceType.DESKTOP)}
          className="group relative p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all border-2 border-transparent hover:border-science-400 flex flex-col items-center"
        >
          <Monitor className="w-16 h-16 text-science-500 mb-4 group-hover:text-science-600 transition-colors" />
          <span className="text-xl font-semibold text-gray-700 dark:text-gray-200">Datora versija</span>
          <span className="text-sm text-gray-400 mt-2">Pārskatāms saraksts</span>
        </motion.button>
      </div>

      <footer className="mt-16 text-sm text-gray-400 text-center">
        Dati ir anonīmi. 100% drošība.
        <br />
        Rīgas Skolēnu Pētniecības Projekts © {new Date().getFullYear()}
      </footer>
    </div>
  );
};