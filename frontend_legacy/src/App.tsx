import { useState } from 'react';
import { RepoInput } from './components/RepoInput';
import { Dashboard } from './components/Dashboard';
import { Sparkles, Github } from 'lucide-react';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);

  const handleReset = () => {
    setJobId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="fixed w-full z-10 glass-card px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-lg">
            <Sparkles className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            FirstPR
          </span>
        </div>
        {jobId && (
          <button
            onClick={handleReset}
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            Analyze Another Repo
          </button>
        )}
      </nav>

      <main className="flex-grow pt-20">
        {!jobId ? (
          <div className="relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute top-40 -left-20 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-30"></div>

            <div className="container mx-auto px-4 py-20 relative z-0">
              <div className="text-center max-w-4xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold mb-8 animate-fade-in-up">
                  <Github size={16} />
                  <span>Open Source Contributor Onboarding</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
                  Ship your <span className="gradient-text">first PR</span><br />
                  in minutes, not days.
                </h1>

                <p className="max-w-2xl mx-auto text-xl text-slate-600 leading-relaxed mb-10">
                  AI-powered architectural analysis, roadmap generation, and issue scouting to help you contribute to any open source project with confidence.
                </p>

                <RepoInput onAnalysisStarted={setJobId} />
              </div>

              {/* Feature Grid */}
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20 text-center">
                {[
                  { title: "Deep Analysis", desc: "Understand imports, dependencies, and code structure instantly." },
                  { title: "Onboarding Roadmap", desc: "A tailored 7-day plan to go from zero to hero." },
                  { title: "Issue Scouting", desc: "Find the perfect first issue based on your tech stack." }
                ].map((feature, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-500">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Dashboard jobId={jobId} />
        )}
      </main>

      <footer className="bg-white border-t py-8">
        <div className="container mx-auto px-4 text-center text-slate-400 text-sm">
          <p>&copy; {new Date().getFullYear()} FirstPR. Built for the Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
