import { useState, lazy, Suspense } from 'react';
import { RepoInput } from './components/RepoInput';
// Lazy load Dashboard to reduce initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
import { Sparkles, Loader2 } from 'lucide-react';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);

  const handleReset = () => {
    setJobId(null);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans text-[#c9d1d9]">
      <nav className="fixed w-full z-10 bg-[#161b22]/80 backdrop-blur-md border-b border-[#30363d] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-[#e6edf3] tracking-tight">
            First<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">PR</span>
          </span>
        </div>
        {jobId && (
          <button
            onClick={handleReset}
            className="text-sm font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors border border-[#30363d] px-4 py-2 rounded-full hover:bg-[#30363d]"
          >
            Analyze Another Repo
          </button>
        )}
      </nav>

      <main className="flex-grow pt-20">
        {!jobId ? (
          <div className="relative overflow-hidden min-h-[calc(100vh-64px)]">
            {/* Minimalist Background - Dark Mode */}
            <div className="absolute inset-0 -z-10 bg-[#0d1117]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-indigo-900/10 blur-[120px] rounded-full"></div>
            </div>

            <div className="container mx-auto px-4 py-24 relative z-0">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1f2428] border border-[#30363d] text-[#c9d1d9] text-xs font-bold tracking-wide mb-8 uppercase animate-fade-in-up shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Powered by Gemini
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-[#e6edf3] tracking-tighter mb-8 leading-none drop-shadow-sm">
                  First<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">PR</span>
                </h1>

                <p className="max-w-xl mx-auto text-xl text-[#8b949e] leading-relaxed mb-12 font-light">
                  Decode open source repositories instantly. <br />
                  <span className="font-medium text-[#c9d1d9]">Deep architecture analysis</span>, community insights, and a personalized onboarding roadmap.
                </p>

                <RepoInput onAnalysisStarted={setJobId} />
              </div>
            </div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-10 h-10 text-[#a371f7] animate-spin" />
            </div>
          }>
            <Dashboard jobId={jobId} />
          </Suspense>
        )
        }
      </main >

      <footer className="bg-[#161b22] border-t border-[#30363d] py-8">
        <div className="container mx-auto px-4 text-center text-[#8b949e] text-sm">
          <p>&copy; {new Date().getFullYear()} FirstPR. Gemini 3 Hackathon</p>
        </div>
      </footer>
    </div >
  );
}

export default App;
