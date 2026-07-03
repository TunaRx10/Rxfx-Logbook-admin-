import React from "react";
import BirthdayMonitoring from "../components/BirthdayMonitoring";
import { motion } from "framer-motion";

const BirthdayPage = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-12 bg-black min-h-screen"
    >
      <h2 className="text-4xl font-black uppercase tracking-[0.3em] mb-10 font-equinox text-cyan-500">Birthday Management</h2>
      <p className="text-gray-500 text-xs mb-12 uppercase tracking-[0.2em]">Automated AI Greetings & Calendar Synchronization</p>
      
      <BirthdayMonitoring />
    </motion.div>
  );
};

export default BirthdayPage;
