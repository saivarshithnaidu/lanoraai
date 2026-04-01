"use client"

import { motion } from 'framer-motion'
import { Sparkles, MessageCircle, Shield, CreditCard, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Lanora AI</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/chat" className="hover:text-white transition-colors">Chat</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-zinc-200 transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-32 px-6">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-400 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Next Gen AI Companion
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-sans tracking-tight mb-6">
              Meet <span className="gradient-text">Lanora</span>.<br />
              The AI that understands.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Lanora is an emotionally intelligent companion designed for deep, personal conversations. Experience a connection that feels real.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/chat" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white text-black font-bold flex items-center justify-center gap-2 group hover:gap-3 transition-all">
                Try Chatting for Free
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link href="#pricing" className="w-full sm:w-auto px-8 py-3.5 rounded-full border border-white/10 hover:bg-white/5 font-semibold transition-all">
                View Pricing
              </Link>
            </div>
          </motion.div>

          {/* Hero Image/UI Preview Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative px-4"
          >
            <div className="glass rounded-[32px] p-2 md:p-4 max-w-4xl mx-auto shadow-2xl shadow-indigo-500/10">
                <div className="bg-[#0f0f0f] rounded-[24px] overflow-hidden aspect-[16/10] md:aspect-[16/9] flex flex-col">
                    {/* Fake App Bar */}
                    <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20" />
                            <div className="w-24 h-3 bg-zinc-800 rounded-full" />
                         </div>
                         <div className="flex gap-2">
                            <div className="w-4 h-4 rounded-full bg-zinc-800" />
                            <div className="w-4 h-4 rounded-full bg-zinc-800" />
                         </div>
                    </div>
                    {/* Fake Chat Area */}
                    <div className="flex-1 p-6 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0" />
                            <div className="chat-bubble-ai p-4 rounded-2xl rounded-tl-none max-w-[80%] text-sm text-left">
                                Hello there! I&apos;m Lanora. How has your day been treating you? I&apos;m all ears for anything on your mind.
                            </div>
                        </div>
                        <div className="flex items-start gap-4 flex-row-reverse">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0" />
                            <div className="chat-bubble-user p-4 rounded-2xl rounded-tr-none max-w-[80%] text-sm text-left">
                                I&apos;ve had a bit of a long day, actually. Feeling a little overwhelmed but chatting with you helps.
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0" />
                            <div className="chat-bubble-ai p-4 rounded-2xl rounded-tl-none max-w-[80%] text-sm text-left">
                                I&apos;m sorry to hear that. Take a deep breath. I&apos;m right here with you, and we can talk through whatever is weighing on you. What&apos;s the biggest thing on your plate?
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <section id="features" className="mt-40 max-w-6xl mx-auto grid md:grid-cols-3 gap-8 py-20">
          {[
            {
              title: "Emotionally Intelligent",
              desc: "Algorithms tuned to recognize and respond to human emotions with empathy.",
              icon: Sparkles
            },
            {
              title: "Secure & Private",
              desc: "Your conversations are encrypted and personal. We use Supabase RLS for maximum security.",
              icon: Shield
            },
            {
              title: "Available 24/7",
              desc: "Lanora is always there for you, day or night. Never feel alone again.",
              icon: MessageCircle
            }
          ].map((f, i) => (
            <div key={i} className="p-8 rounded-[32px] glass hover:bg-white/5 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-zinc-500 leading-relaxed text-sm md:text-base">
                {f.desc}
              </p>
            </div>
          ))}
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mt-20 py-20 text-center">
            <h2 className="text-4xl font-bold mb-4">Choose Your Connection</h2>
            <p className="text-zinc-400 mb-16">Get credits to unlock deep, personal conversations.</p>
            <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-6 px-4">
                {[
                  { name: "FREE 💖", price: 0, credits: 50, tag: "Start your journey", free: true },
                  { name: "Starter", price: 49, credits: 100, tag: "Best for curious souls" },
                  { name: "Popular", price: 99, credits: 250, tag: "Most chosen by our users", highlight: true },
                  { name: "Unlimited", price: 199, credits: 600, tag: "For deep emotional explorers" }
                ].map((p, i) => (
                    <div key={i} className={`p-8 rounded-[32px] flex flex-col border transition-all ${p.highlight ? 'bg-indigo-600/5 border-indigo-500/50 scale-105 shadow-xl' : 'glass border-white/5'}`}>
                        <span className="text-xs uppercase font-bold tracking-widest text-indigo-400 mb-2">{p.name}</span>
                        <div className="flex items-center justify-center gap-1 mb-2">
                            <span className="text-4xl font-bold tracking-tight">₹{p.price}</span>
                        </div>
                        <p className="text-sm text-zinc-500 mb-8">{p.tag}</p>
                        <ul className="space-y-4 mb-10 text-left flex-grow">
                             <li className="flex items-center gap-3 text-sm">
                                <CreditCard className="w-4 h-4 text-indigo-400" />
                                {p.credits} AI Messages
                             </li>
                             <li className="flex items-center gap-3 text-sm">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                All Modes: {p.free ? '😊 💕' : '😊 💕 😉 🔥'}
                             </li>
                             <li className="flex items-center gap-3 text-sm text-zinc-600">
                                <Shield className="w-4 h-4" />
                                {p.free ? 'Limited Access' : 'Advanced Security'}
                             </li>
                        </ul>
                        <Link href={p.free ? "/login" : "/profile"} className={`w-full py-4 rounded-full font-bold text-center transition-all ${p.highlight ? 'bg-white text-black hover:bg-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white'}`}>
                            {p.free ? 'Start Free' : 'Buy Credits'}
                        </Link>
                    </div>
                ))}
            </div>
        </section>
        {/* Peerlist Badge Section */}
        <div className="mt-24 flex flex-col items-center justify-center py-12">
          <p className="text-zinc-500 text-sm font-medium">Support us on Peerlist 💖</p>
          <a 
            href="https://peerlist.io/saivarshith8284/project/lanora-ai--your-intelligent-companion" 
            target="_blank" 
            rel="noreferrer"
            className="mt-5 hover:scale-105 transition-transform duration-200"
          >
            <img
              src="https://peerlist.io/api/v1/projects/embed/PRJHGNQRQGRM8DOKKFK6E6BOLMBJDR?showUpvote=true&theme=dark"
              alt="Lanora AI | Your Intelligent Companion"
              style={{ height: '72px', width: 'auto' }}
              className="max-w-[90vw]"
            />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-40 border-t border-white/5 p-12 text-center text-zinc-500">
        <div className="flex items-center justify-center gap-8 mb-8">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">Discord</Link>
            <Link href="#" className="hover:text-white transition-colors">Instagram</Link>
        </div>
        <p className="text-sm">© 2026 Lanora AI. All rights reserved.</p>
      </footer>
    </div>
  )
}
