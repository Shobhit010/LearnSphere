import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Brain, Award, ShieldCheck, Users, HelpCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-20 left-1/4 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute top-80 right-10 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl" />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center md:pt-28 md:pb-32">
        <div className="inline-flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-full px-4 py-1.5 mb-8 hover:border-brand-500/40 transition-colors cursor-pointer">
          <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">New Features</span>
          <span className="h-1.5 w-1.5 bg-brand-500 rounded-full" />
          <span className="text-xs text-slate-350 font-medium">AI Lecture Assistant & Chapter Practice Quizzes</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Learn Smarter and Faster with{' '}
          <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI-Powered
          </span>{' '}
          Curriculums
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Master the MERN stack, database design, and cloud deployments. Access interactive video players with automated progress logs, verifiable certificates, and an AI tutor that answers transcript questions in real-time.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/courses"
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand-500/20 hover:scale-[1.02]"
          >
            <span>Explore Courses</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/register"
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold px-8 py-4 rounded-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <span>Join as Instructor</span>
          </Link>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="border-t border-slate-900 bg-slate-950/30 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Platform Features</h2>
            <p className="text-slate-400 mt-3 text-sm md:text-base">Everything you need to experience high-grade interactive studying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-5 text-brand-400 border border-brand-500/20">
                <Play className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Video Progress Logs</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Watch lecture modules via YouTube integration with real-time tracking that saves watch stats and marks completion above thresholds.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-5 text-indigo-400 border border-indigo-500/20">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Video Tutor</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ask questions to our AI assistant scoped specifically to transcripts. Fallback responses are provided if captions are disabled.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5 text-violet-400 border border-violet-500/20">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verifiable Certificates</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Earn verifiable PDF certificates upon achieving 100% course progress, queryable publicly via identifier links.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
              <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-5 text-pink-400 border border-pink-500/20">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Chapter Quizzes</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Take practice multiple-choice quizzes generated dynamically from the transcripts to consolidate your knowledge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="bg-gradient-to-r from-brand-950/20 via-indigo-950/20 to-violet-950/20 border-y border-slate-900 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-around gap-10 text-center">
          <div>
            <span className="block text-4xl md:text-5xl font-black text-white">10k+</span>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-2 block">Active Learners</span>
          </div>
          <div className="h-12 w-px bg-slate-800 hidden md:block" />
          <div>
            <span className="block text-4xl md:text-5xl font-black text-white">200+</span>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-2 block">MERN Curriculums</span>
          </div>
          <div className="h-12 w-px bg-slate-800 hidden md:block" />
          <div>
            <span className="block text-4xl md:text-5xl font-black text-white">15k+</span>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-2 block">Issued Certificates</span>
          </div>
        </div>
      </section>

      {/* Platform trust details */}
      <section className="max-w-4xl mx-auto text-center py-20 px-6">
        <h2 className="text-2xl font-bold text-slate-200">Start Learning Today</h2>
        <p className="text-slate-450 text-sm max-w-lg mx-auto mt-3">
          Sign up now as a student to purchase courses, or register as an instructor to build your curriculum drag-and-drop structures and monetize your expertise.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-lg mt-6 transition-all"
        >
          <span>Get Started</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
