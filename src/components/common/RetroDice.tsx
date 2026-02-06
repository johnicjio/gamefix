import React from 'react';
import { motion } from 'framer-motion';

interface RetroDiceProps {
  value: number | null;
  rolling: boolean;
  onClick: () => void;
  disabled: boolean;
}

const RetroDice: React.FC<RetroDiceProps> = ({ value, rolling, onClick, disabled }) => {
  return (
    <div className="relative w-24 h-24 perspective-1000">
      <motion.div
        className={`w-full h-full relative preserve-3d cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={!disabled ? onClick : undefined}
        animate={rolling ? {
          rotateX: [0, 360, 720],
          rotateY: [0, 360, 720],
          scale: [1, 1.2, 1]
        } : {
          rotateX: 0,
          rotateY: 0,
          scale: 1
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Cube Face Front */}
        <div className="absolute w-full h-full bg-slate-800 border-2 border-cyan-400 flex items-center justify-center translate-z-12">
          {value && !rolling ? <span className="text-4xl text-cyan-400 font-bold">{value}</span> : <span className="text-cyan-400">?</span>}
        </div>
        {/* Additional faces for 3D effect would go here */}
      </motion.div>
      
      {/* Glow Effect */}
      <div className={`absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full transition-opacity ${rolling ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};

export default RetroDice;
