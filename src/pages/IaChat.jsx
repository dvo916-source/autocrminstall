import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, Sparkles, Shield, Cpu, Activity, Zap, ChevronRight, Terminal, Brain, Database, ShieldCheck, Clock, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

// Neural Background Animation
const NeuralCore = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Pulsing Central Hub */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full"
            />

            {/* Matrix-like Grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(#06b6d4 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Floating Data Nodes */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        y: [-20, 20, -20],
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        delay: i * 0.5
                    }}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]"
                    style={{
                        top: `${20 + (i * 15)}%`,
                        left: `${10 + (i * 18)}%`
                    }}
                />
            ))}
        </div>
    );
};

const TechCard = ({ to, icon: Icon, title, description, tags, metric, metricLabel, color, delay }) => {
    const colorClasses = {
        cyan: "from-cyan-500/20 to-blue-600/20 border-cyan-500/30 text-cyan-400 shadow-cyan-500/10",
        purple: "from-purple-500/20 to-pink-600/20 border-purple-500/30 text-purple-400 shadow-purple-500/10",
        emerald: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="relative group"
        >
            <Link to={to} className="block h-full">
                <div className={`h-full bg-gradient-to-br ${colorClasses[color]} backdrop-blur-3xl border rounded-[2.5rem] p-10 transition-all duration-500 flex flex-col items-start relative overflow-hidden group-hover:border-white/20 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]`}>

                    {/* Interior Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-white/10 transition-colors" />

                    {/* Header: Icon + Metric */}
                    <div className="w-full flex justify-between items-start mb-10">
                        <div className={`p-5 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500 shadow-xl`}>
                            <Icon size={32} />
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black  tracking-[0.2em] text-white/40 mb-1 font-rajdhani">{metricLabel}</div>
                            <div className="text-xl font-black text-white italic font-rajdhani tracking-tight">{metric}</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black text-white mb-3 font-rajdhani  italic tracking-tighter">
                            {title.split(' ')[0]} <span className={colorClasses[color].split(' ')[2]}>{title.split(' ')[1]}</span>
                        </h3>
                        <p className="text-sm text-white/50 font-medium leading-relaxed mb-8 max-w-[240px]">
                            {description}
                        </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {tags.map(tag => (
                            <span key={tag} className="px-3 py-1 rounded-lg bg-black/20 border border-white/5 text-[9px] font-black  tracking-widest text-white/40 font-rajdhani">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Action Arrow */}
                    <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                            <ChevronRight size={24} />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

const IaChat = () => {
    return (
        <div className="h-full w-full bg-[#020617] relative overflow-hidden flex flex-col">
            <NeuralCore />

            {/* Content Container */}
            <div className="relative z-10 flex-1 flex flex-col px-12 pt-4 pb-24 max-w-[1600px] mx-auto w-full">

                {/* Header Section */}
                <header className="flex justify-between items-end mb-16">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 mb-4"
                        >
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_#22d3ee]" />
                            <span className="text-sm font-black text-cyan-500  tracking-widest font-rajdhani">System Cognitive Hub v2.5</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl font-black text-white tracking-tighter leading-none italic font-rajdhani "
                        >
                            HYPERCORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]">AI Hub</span>
                        </motion.h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-right hidden lg:block"
                    >
                        <div className="flex items-center gap-8 bg-white/5 backdrop-blur-xl border border-white/5 py-4 px-8 rounded-3xl">
                            <div className="text-left">
                                <div className="text-[9px] font-black text-gray-500  tracking-widest font-rajdhani">Local Time</div>
                                <div className="text-xl font-black text-white font-rajdhani tabular-nums">14:32:04</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-left">
                                <div className="text-[9px] font-black text-gray-500  tracking-widest font-rajdhani">System Stability</div>
                                <div className="text-xl font-black text-emerald-500 font-rajdhani">99.98%</div>
                            </div>
                        </div>
                    </motion.div>
                </header>

                {/* Hub Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 flex-1">
                    <TechCard
                        to="/crm-diego"
                        icon={Bot}
                        title="DIEGO CORE"
                        description="Conversational AI engine specialized in high-performance lead conversion on WhatsApp."
                        tags={["Autonomous", "Real-time", "Sales Mode"]}
                        metric="894"
                        metricLabel="Conversations"
                        color="cyan"
                        delay={0.2}
                    />
                    <TechCard
                        to="/ia-prompts"
                        icon={Brain}
                        title="NEURAL CONTEXT"
                        description="Access AI cognition layers to fine-tune prompts, behavior logic and semantic memory."
                        tags={["Prompting", "NLP", "Behavior"]}
                        metric="12.4k"
                        metricLabel="Tokens / Min"
                        color="purple"
                        delay={0.3}
                    />
                    <TechCard
                        to="/admin-ia"
                        icon={ShieldCheck}
                        title="SYSTEM RULES"
                        description="Control core AI protocols, Meta API connections and operational business logic."
                        tags={["Meta API", "Security", "Rules"]}
                        metric="Active"
                        metricLabel="Gateway Status"
                        color="emerald"
                        delay={0.4}
                    />
                </div>

                {/* Statistics Bottom Bar */}
                <footer className="mt-8 flex flex-wrap items-center justify-between gap-8 pt-6 border-t border-white/5 pb-8">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-3">
                            <Activity size={18} className="text-cyan-500" />
                            <div>
                                <div className="text-[8px] font-black text-gray-600  tracking-widest font-rajdhani">Network Latency</div>
                                <div className="text-xs font-black text-white font-rajdhani">24ms - Stable</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Layers size={18} className="text-purple-500" />
                            <div>
                                <div className="text-[8px] font-black text-gray-600  tracking-widest font-rajdhani">Model Provider</div>
                                <div className="text-xs font-black text-white font-rajdhani italic">OpenAI GPT-4o</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Cpu size={18} className="text-emerald-500" />
                            <div>
                                <div className="text-[8px] font-black text-gray-600  tracking-widest font-rajdhani">Uptime</div>
                                <div className="text-xs font-black text-white font-rajdhani underline decoration-emerald-500/50 underline-offset-4">324d 14h 02m</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full bg-[#0a0f1e] border-2 border-[#1e293b] flex items-center justify-center">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 opacity-50" />
                                </div>
                            ))}
                        </div>
                        <div className="text-[10px] font-black text-white/40  tracking-widest font-rajdhani">+12 Systems Linked</div>
                    </div>
                </footer>
            </div>

            {/* Ambient Lighting */}
            <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 bg-cyan-600/10 blur-[150px] rounded-full" />
            <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full" />
        </div>
    );
};

export default IaChat;
