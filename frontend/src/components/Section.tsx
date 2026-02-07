import React from 'react';

interface SectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, icon: Icon, children }) => (
    <section className="mb-8 p-6 bg-[#161b22]/60 backdrop-blur-sm rounded-xl border border-[#30363d] shadow-sm">
        <h3 className="text-lg font-bold text-[#e6edf3] mb-4 flex items-center gap-2 border-b border-[#30363d] pb-2">
            <Icon className="text-[#a371f7]" size={20} />
            {title}
        </h3>
        {children}
    </section>
);
