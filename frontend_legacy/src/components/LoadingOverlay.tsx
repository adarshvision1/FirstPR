import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Search, BrainCircuit, FileCode2 } from 'lucide-react';

const steps = [
    { icon: Search, text: "Fetching Repository Metadata...", duration: 2000 },
    { icon: FileCode2, text: "Analyzing Code Structure & Dependencies...", duration: 3000 },
    { icon: BrainCircuit, text: "Consulting AI Architect...", duration: 4000 },
    { icon: CheckCircle2, text: "Finalizing Onboarding Plan...", duration: 1500 },
];

export const LoadingOverlay = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (currentStep < steps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, steps[currentStep].duration);
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    return (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
            {/* Background Blobs for Overlay */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white/80 p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-white/50 backdrop-blur-md"
            >
                <div className="flex justify-center mb-10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                        <Loader2 className="h-16 w-16 text-indigo-600 animate-spin relative z-10" />
                    </div>
                </div>

                <div className="space-y-6">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0.5, x: -10 }}
                                animate={{
                                    opacity: isActive || isCompleted ? 1 : 0.4,
                                    x: 0,
                                    scale: isActive ? 1.02 : 1
                                }}
                                className={`flex items-center gap-5 ${isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}
                            >
                                <div className={`p-3 rounded-full transition-colors duration-500 ${isActive ? 'bg-indigo-100 text-indigo-600' : isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100'}`}>
                                    {isCompleted ? (
                                        <CheckCircle2 size={22} />
                                    ) : (
                                        <Icon size={22} />
                                    )}
                                </div>
                                <span className="text-lg tracking-tight">{step.text}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-indicator"
                                        className="ml-auto w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>
            <p className="mt-8 text-slate-500 text-sm font-medium animate-pulse tracking-widest uppercase opacity-80">
                Crafting your tailored roadmap...
            </p>
        </div>
    );
};
