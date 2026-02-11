import { useState, lazy, Suspense, useCallback } from 'react';
import { RepoInput } from './components/RepoInput';
import { ErrorBoundary } from './components/ErrorBoundary';
// Lazy load Dashboard to reduce initial bundle size
const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
import { Sparkles, Loader2 } from 'lucide-react';

function App() {
  const [jobId, setJobId] = useState<string | null>(null);

  const handleReset = useCallback(() => {
    setJobId(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col font-sans text-[#c9d1d9]">
      <nav className="fixed w-full z-10 bg-[#161b22]/80 backdrop-blur-md border-b border-[#30363d] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between transition-all duration-300" role="navigation" aria-label="Main navigation">
        <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset} role="button" tabIndex={0} aria-label="Go to homepage" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleReset(); } }}>
          <div className="bg-gradient-to-tr from-[#a371f7] to-[#8b5cf6] p-2 rounded-lg shadow-lg shadow-[#a371f7]/20">
            <Sparkles className="text-white h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold text-[#e6edf3] tracking-tight">
            First<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a371f7] to-[#8b5cf6]">PR</span>
          </span>
        </div>
        {jobId && (
          <button
            onClick={handleReset}
            className="text-sm font-medium text-white transition-all duration-300 bg-gradient-to-r from-[#a371f7] to-[#8b5cf6] px-5 py-2 rounded-full hover:shadow-lg hover:shadow-[#a371f7]/25 hover:brightness-110 active:scale-95 animate-fade-in"
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
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-[#a371f7]/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="container mx-auto px-4 py-24 relative z-0">
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1f2428] border border-[#30363d] text-[#c9d1d9] text-xs font-bold tracking-wide mb-8 uppercase animate-fade-in-up shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a371f7] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#a371f7]"></span>
                  </span>
                  Powered by Gemini
                </div>

                <h1 className="text-6xl md:text-8xl font-black text-[#e6edf3] tracking-tighter mb-8 leading-none drop-shadow-sm animate-fade-in-up">
                  First<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a371f7] to-[#8b5cf6]">PR</span>
                </h1>

                <p className="max-w-xl mx-auto text-xl text-[#8b949e] leading-relaxed mb-12 font-light animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  Decode open source repositories instantly. <br />
                  <span className="font-medium text-[#c9d1d9]">Deep architecture analysis</span>, community insights, and a personalized onboarding roadmap.
                </p>

                <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                  <RepoInput onAnalysisStarted={setJobId} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-10 h-10 text-[#a371f7] animate-spin" />
            </div>
          }>
            <ErrorBoundary>
              <Dashboard jobId={jobId} />
            </ErrorBoundary>
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
