"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { 
  Send, 
  Sparkles, 
  Menu, 
  X, 
  Settings, 
  LogOut, 
  CreditCard,
  Heart,
  User,
  Zap,
  Loader2,
  Trash2,
  Plus,
  History as HistoryIcon,
  Camera,
  Image as ImageIcon,
  Users,
  MessageCircle,
  MoreVertical,
  ChevronRight,
  UserPlus,
  Phone,
  Video
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id?: string
  role?: 'user' | 'assistant'
  sender_id?: string
  content: string
  images?: string[] // For search results
  created_at?: string
}

export default function ChatPage() {
  const [chatType, setChatType] = useState<'ai' | 'people'>('ai')
  
  // AI Chat States
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [mode, setMode] = useState<'romantic' | 'friendly' | 'flirty'>('friendly')
  
  // People Chat States
  const [peopleConversations, setPeopleConversations] = useState<any[]>([])
  const [activePeopleConversationId, setActivePeopleConversationId] = useState<string | null>(null)
  const [peopleMessages, setPeopleMessages] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [isTyping, setIsTyping] = useState(false)
  
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [image, setImage] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large. Please keep it under 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const initChat = async () => {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          if (res.status === 401) router.push('/login')
          throw new Error('Unauthorized')
        }
        const data = await res.json()
        setUser({ id: data.user.userId, email: data.user.email, name: data.user.name })
        setCredits(data.profile.credits)
        setUserRole(data.profile.role || 'user')
        
        // Fetch conversations
        await fetchConversations()
        await fetchPeopleConversations()
        await fetchUsers()
      } catch (e) {
        console.error('Chat init error:', e)
      }
    }
    initChat()
  }, [])

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
      
      if (data.conversations?.length > 0) {
        setActiveConversationId(data.conversations[0].id)
        fetchMessages(data.conversations[0].id)
      } else {
        handleNewChat()
      }
    } catch (e) {
      console.error('Fetch conversations error:', e)
    }
  }

  const fetchPeopleConversations = async () => {
    try {
      const res = await fetch('/api/people-chat/conversations')
      const data = await res.json()
      setPeopleConversations(data.conversations || [])
      if (data.conversations?.length > 0 && !activePeopleConversationId) {
        setActivePeopleConversationId(data.conversations[0].id)
        fetchPeopleMessages(data.conversations[0].id)
      }
    } catch (e) {
      console.error('Fetch people conversations error:', e)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setAvailableUsers(data.users || [])
    } catch (e) {
      console.error('Fetch users error:', e)
    }
  }

  const fetchPeopleMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/people-chat/messages?conversation_id=${convId}`)
      const data = await res.json()
      setPeopleMessages(data.messages || [])
    } catch (e) {
      console.error('Fetch people messages error:', e)
    }
  }

  const handleStartPeopleChat = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/people-chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      })
      const data = await res.json()
      if (data.conversation) {
        await fetchPeopleConversations()
        setActivePeopleConversationId(data.conversation.id)
        fetchPeopleMessages(data.conversation.id)
      }
    } catch (e) {
      toast.error('Could not start chat')
    }
  }

  const channelRef = useRef<any>(null)

  // Realtime Subscription & Typing Indicator
  useEffect(() => {
    if (chatType === 'people' && activePeopleConversationId) {
      const channel = supabase
        .channel(`room:${activePeopleConversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${activePeopleConversationId}`,
          },
          (payload) => {
            setPeopleMessages((prev) => [...prev, payload.new])
          }
        )
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.userId !== user?.id) {
            setIsTyping(true)
            setTimeout(() => setIsTyping(false), 3000)
          }
        })
        .subscribe()

      channelRef.current = channel

      return () => {
        supabase.removeChannel(channel)
        channelRef.current = null
      }
    }
  }, [chatType, activePeopleConversationId])

  const handleTyping = () => {
     if (channelRef.current) {
       channelRef.current.send({
         type: 'broadcast',
         event: 'typing',
         payload: { userId: user?.id }
       })
     }
  }

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}`)
      if (!res.ok) throw new Error('Failed to fetch messages')
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
        toast.error('Could not load chat history')
    }
  }

  const handleNewChat = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      })
      const data = await res.json()
      if (data.conversation) {
        setConversations(prev => [data.conversation, ...prev])
        setActiveConversationId(data.conversation.id)
        setMessages([])
      }
    } catch (e) {
      toast.error('Could not create new chat')
    } finally {
      setLoading(false)
    }
  }

  const switchConversation = (id: string) => {
    setActiveConversationId(id)
    fetchMessages(id)
    setSidebarOpen(false)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !image) return 

    if (chatType === 'people') {
      if (!activePeopleConversationId) return
      const content = input
      setInput('')
      try {
        await fetch('/api/people-chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: activePeopleConversationId,
            content
          })
        })
      } catch (e) {
        toast.error('Failed to send message')
      }
      return
    }

    if (userRole !== 'admin' && credits !== null && credits <= 0) {
      toast.error('Insufficient credits. Order more to continue.')
      return
    }

    const userMsg: Message = { role: 'user', content: input }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedMessages, 
          mode,
          image,
          conversation_id: activeConversationId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsPayment) {
            toast.error('Insufficient credits. Please recharge.')
        } else {
            toast.error(data.error || 'Failed to get response')
        }
        // Remove locally added user message to keep UI consistent with DB
        setMessages(prev => prev.slice(0, -1))
        return
      }

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.content,
        images: data.images 
      }])
      setCredits(data.creditsRemaining)
      setImage(null)
      
      if (input.toLowerCase().includes('smile') || input.toLowerCase().includes('happy')) {
        setIsSmiling(true)
        setTimeout(() => setIsSmiling(false), 5000)
      }
    } catch (error: any) {
      toast.error('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const clearChat = async () => {
    try {
      const res = await fetch('/api/messages/clear', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to clear chat')
      setMessages([])
      toast.success('Chat history cleared')
    } catch (e) {
      toast.error('Could not clear chat')
    }
  }

  const [isSmiling, setIsSmiling] = useState(false)

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setIsSmiling(true)
      const timer = setTimeout(() => setIsSmiling(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [messages])

  return (
    <div className="flex h-screen bg-[#0b0b0f] overflow-hidden text-slate-200 font-['Outfit'] relative">
      {/* Subtle Background */}
      <div className="bg-romantic-glow" />
      
      {/* Reduced Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: '110vh', x: `${Math.random() * 100}vw`, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: '-10vh', 
              opacity: [0, 0.2, 0],
              scale: [0.5, 0.8, 0.5],
            }}
            transition={{ 
              duration: 20 + Math.random() * 20, 
              repeat: Infinity, 
              delay: Math.random() * 10,
              ease: "linear"
            }}
            className="absolute text-pink-500/5"
          >
            <Heart size={20 + Math.random() * 20} fill="currentColor" />
          </motion.div>
        ))}
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 h-full border-r border-white/5 glass p-5 z-20 relative">
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <Sparkles className="w-5 h-5 text-pink-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white/90">Lanora</span>
        </div>

        {/* Chat Type Toggle */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 mb-6">
          <button 
            onClick={() => setChatType('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all ${chatType === 'ai' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            <Heart className={`w-3.5 h-3.5 ${chatType === 'ai' ? 'text-pink-500' : ''}`} />
            AI Chat
          </button>
          <button 
            onClick={() => setChatType('people')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold transition-all ${chatType === 'people' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            <Users className={`w-3.5 h-3.5 ${chatType === 'people' ? 'text-purple-500' : ''}`} />
            People
          </button>
        </div>

        {chatType === 'ai' ? (
          <>
            {/* New Chat Button */}
            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[14px] font-bold shadow-lg shadow-pink-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all mb-8 group shrink-0"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              New AI Conversation
            </button>

            {/* Navigation Sections */}
            <div className="flex-grow space-y-6 overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 px-4 mb-2 block">Conversations</span>
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all text-left group ${
                        activeConversationId === conv.id 
                          ? 'bg-white/10 text-white border border-white/5' 
                          : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeConversationId === conv.id ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]' : 'bg-slate-700'}`} />
                      <span className="truncate flex-1">{conv.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 px-4 mb-2 block">Management</span>
                <button onClick={clearChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-slate-500 hover:text-pink-400 hover:bg-white/5 transition-all text-left">
                  <Trash2 className="w-4 h-4" />
                  Clear ALL History
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Find People Section */}
            <div className="flex-grow space-y-6 overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 px-4 mb-2 block">Your Chats</span>
                <div className="space-y-1">
                  {peopleConversations.map((conv) => {
                    const otherParticipant = conv.chat_participants?.find((p: any) => p.user_id !== user?.id);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          setActivePeopleConversationId(conv.id)
                          fetchPeopleMessages(conv.id)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all text-left group ${
                          activePeopleConversationId === conv.id 
                            ? 'bg-white/10 text-white border border-white/5' 
                            : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0 ${activePeopleConversationId === conv.id ? 'text-purple-400' : 'text-slate-600'}`}>
                          <User className="w-4 h-4" />
                        </div>
                        <span className="truncate flex-1 font-semibold">{otherParticipant?.profiles?.name || 'Someone'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 px-4 mb-2 block">People on Lanora</span>
                <div className="space-y-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleStartPeopleChat(u.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium text-slate-500 hover:text-white hover:bg-white/5 transition-all text-left border border-transparent group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-pink-500/5 group-hover:bg-pink-500/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-pink-500/50 group-hover:text-pink-400" />
                      </div>
                      <span className="truncate flex-1">{u.name}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer Section */}
        <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {userRole === 'admin' ? 'Premium Access' : 'Your Energy'}
                    </span>
                    <Zap className={`w-3.5 h-3.5 ${userRole === 'admin' ? 'text-yellow-400' : 'text-pink-400'}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-xl font-bold text-white tracking-tight">
                    {userRole === 'admin' ? '∞ Unlimited' : (credits ?? '--')}
                  </div>
                  {userRole === 'admin' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 uppercase tracking-tighter">Admin</span>
                  )}
                </div>
            </div>

            <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <User className="w-4.5 h-4.5 text-slate-400" />
                </div>
                <div className="flex-grow overflow-hidden">
                    <div className="text-xs font-bold truncate text-white/80 flex items-center gap-2">
                      {user?.email?.split('@')[0]}
                    </div>
                    <div className="text-[10px] text-slate-600 truncate">{user?.email}</div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-pink-400 transition-colors">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative z-10">
         <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-8 glass shrink-0 relative z-20">
            <button className="md:hidden p-2 bg-white/5 rounded-xl text-slate-400" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                 <div className="relative">
                   <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center border border-white/5">
                      {chatType === 'ai' ? <Sparkles className="w-4.5 h-4.5 text-pink-400" /> : <User className="w-4.5 h-4.5 text-purple-400" />}
                   </div>
                   <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border-2 border-slate-950 absolute -top-0.5 -right-0.5" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[15px] font-bold text-white tracking-tight leading-none mb-1">
                      {chatType === 'ai' ? 'Lanora' : (peopleConversations.find(c => c.id === activePeopleConversationId)?.chat_participants?.find((p: any) => p.user_id !== user?.id)?.profiles?.name || 'Searching...')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1 h-1 rounded-full bg-pink-500 animate-pulse" />
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {chatType === 'ai' ? (loading ? 'thinking...' : 'online') : (isTyping ? 'typing...' : 'online')}
                      </span>
                    </div>
                 </div>
               </div>

               {/* AI Mode Selector (Only in AI mode) */}
               {chatType === 'ai' && (
                 <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 ml-4 hidden md:flex">
                   {[
                     { id: 'romantic', label: '💕' },
                     { id: 'friendly', label: '😊' },
                     { id: 'flirty', label: '😏' }
                   ].map((m) => (
                     <button
                       key={m.id}
                       onClick={() => setMode(m.id as any)}
                       className={`w-10 h-8 rounded-full flex items-center justify-center transition-all ${mode === m.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       <span className="text-sm">{m.label}</span>
                     </button>
                   ))}
                 </div>
               )}
            </div>

            <div className="flex items-center gap-3">
              {chatType === 'people' && (
                <div className="flex items-center gap-1 mr-4 hidden sm:flex">
                  <button className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"><Phone className="w-4 h-4" /></button>
                  <button className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"><Video className="w-4 h-4" /></button>
                </div>
              )}
              <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-slate-500 group">
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </button>
            </div>
         </header>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-8 pb-40 px-4 md:px-0">
          <div className="max-w-[850px] mx-auto px-6 space-y-4">
             {chatType === 'ai' ? (
                <>
                {messages.length === 0 && !loading && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="min-h-[60vh] flex items-center justify-center"
                   >
                      <div className="space-y-6 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center mx-auto shadow-inner group cursor-pointer transition-transform hover:scale-110">
                          <Heart className="w-8 h-8 text-pink-400/50 group-hover:text-pink-400 transition-colors" />
                        </div>
                        <div className="space-y-2">
                           <h2 className="text-2xl font-bold tracking-tight text-white/90">Hi… I missed you 💖</h2>
                           <p className="text-slate-500 text-[15px] font-medium leading-relaxed max-w-[320px] mx-auto">What’s on your mind today? I'm here to listen, darling.</p>
                        </div>
                      </div>
                   </motion.div>
                )}

                {messages.map((m, i) => (
                  <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} mb-4`}
                  >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 ${m.role === 'user' ? 'bg-zinc-800' : 'bg-pink-500/5'}`}>
                          {m.role === 'user' ? <User className="w-4 h-4 text-slate-500" /> : <Heart className="w-4 h-4 text-pink-400/60" />}
                      </div>
                      <div className={`px-4.5 py-3 rounded-[18px] max-w-[70%] md:max-w-[65%] text-[15px] leading-[1.6] ${m.role === 'user' ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/10' : 'chat-bubble-ai text-slate-300'}`}>
                         <div className="space-y-4">
                            <div className="whitespace-pre-wrap">{m.content.includes('JSON_START') ? m.content.split('JSON_START')[0].trim() : m.content}</div>
                            {(m.images || (m.content.includes('JSON_START') ? (() => { try { return JSON.parse(m.content.split('JSON_START')[1].split('JSON_END')[0]).images } catch(e) { return [] } })() : []))?.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {(m.images || JSON.parse(m.content.split('JSON_START')[1].split('JSON_END')[0]).images).map((img: string, idx: number) => (
                                  <motion.div 
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative aspect-square overflow-hidden rounded-xl border border-white/10 group cursor-zoom-in"
                                  >
                                    <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                  </motion.div>
                                ))}
                              </div>
                            )}
                         </div>
                      </div>
                  </motion.div>
                ))}
                </>
             ) : (
                <>
                {peopleMessages.length === 0 && (
                   <div className="min-h-[60vh] flex items-center justify-center text-slate-600 text-[14px] font-medium italic">
                      Start your conversation...
                   </div>
                )}
                {peopleMessages.map((m, i) => (
                  <motion.div
                      key={m.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${m.sender_id === user?.id ? 'flex-row-reverse' : ''} mb-4`}
                  >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 ${m.sender_id === user?.id ? 'bg-zinc-800' : 'bg-purple-500/5'}`}>
                          {m.sender_id === user?.id ? <User className="w-4 h-4 text-slate-500" /> : <MessageCircle className="w-4 h-4 text-purple-400/60" />}
                      </div>
                      <div className={`px-4.5 py-3 rounded-[18px] max-w-[70%] md:max-w-[65%] text-[15px] leading-[1.6] ${m.sender_id === user?.id ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/10' : 'bg-white/5 text-slate-300 border border-white/5'}`}>
                         <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                  </motion.div>
                ))}
                </>
             )}
            
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex gap-3 mb-4"
              >
                  <div className="w-8 h-8 rounded-lg bg-pink-500/5 flex items-center justify-center shrink-0 border border-white/5">
                      <Heart className="w-4 h-4 text-pink-400/40" />
                  </div>
                  <div className="chat-bubble-ai px-4.5 py-3 rounded-[18px] flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500/40 animate-pulse" />
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500/40 animate-pulse [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-500/40 animate-pulse [animation-delay:0.4s]" />
                  </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Minimal Input Area */}
        <div className="absolute bottom-0 left-0 w-full z-30 pt-4 pb-10 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/95 to-transparent">
          <div className="max-w-[850px] mx-auto px-6">
            <form onSubmit={handleSend} className="relative group">
               {/* Image Preview */}
               <AnimatePresence>
                 {image && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full mb-4 left-0 p-2 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-xl"
                    >
                        <div className="relative w-20 h-20">
                            <img src={image} className="w-full h-full object-cover rounded-xl" />
                            <button 
                              onClick={() => setImage(null)}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </motion.div>
                 )}
               </AnimatePresence>

               <div className="relative">
                  <input 
                    type="file" 
                    hidden 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-full hover:bg-white/10 text-slate-500 transition-all"
                      >
                         <Camera className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 rounded-full hover:bg-white/10 text-slate-500 transition-all"
                      >
                         <ImageIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <textarea
                      rows={1}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        handleTyping()
                      }}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSend(e)
                          }
                      }}
                      placeholder="Whisper something..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-full py-4 pl-24 pr-16 text-[15px] font-medium resize-none outline-none focus:bg-white/[0.05] focus:border-pink-500/30 transition-all custom-scrollbar backdrop-blur-xl min-h-[56px] flex items-center text-slate-200"
                  />
                  <button 
                    type="submit"
                    disabled={loading || (!input.trim() && !image)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 text-pink-400 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all disabled:opacity-20 disabled:grayscale"
                  >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
               </div>
            </form>
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSidebarOpen(false)}
               className="fixed inset-0 bg-black/80 backdrop-blur-lg z-40 md:hidden"
            />
            <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-80 bg-[#0f0a14] border-r border-white/10 z-50 p-8 flex flex-col"
            >
                <button onClick={() => setSidebarOpen(false)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-zinc-400 hover:text-[#ff4d8d] transition-colors">
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff4d8d] to-[#9b5cff] flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white/90">Lanora AI</span>
                </div>

                <div className="flex-grow space-y-6">
                    <div className="space-y-2">
                        <button 
                          onClick={() => { clearChat(); setSidebarOpen(false); }}
                          className="w-full flex items-center justify-center gap-2 px-6 py-5 rounded-[24px] bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold"
                        >
                          <Plus className="w-5 h-5" />
                          New Chat
                        </button>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-4">Menu</span>
                        <Link href="/chat" onClick={()=>setSidebarOpen(false)} className="flex items-center gap-4 px-5 py-4 rounded-[20px] bg-white/5 text-white font-bold">
                            <Sparkles className="w-5 h-5 text-pink-400" />
                            Messenger
                        </Link>
                        <button onClick={() => { clearChat(); setSidebarOpen(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-[20px] hover:bg-white/5 text-slate-500 hover:text-red-400 transition-all font-bold">
                            <Trash2 className="w-5 h-5" />
                            Clear History
                        </button>
                    </div>
                </div>
                
                <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 mb-8 mt-auto">
                     <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block mb-2">Energy</span>
                     <div className="text-3xl font-black italic text-pink-400">{credits ?? '--'}</div>
                </div>

                <div className="flex items-center gap-4 pt-8 border-t border-white/10">
                   <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 font-bold">
                     {user?.email?.[0].toUpperCase()}
                   </div>
                   <div className="flex-grow font-bold text-sm tracking-tight text-white/80">{user?.email?.split('@')[0]}</div>
                   <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white"><LogOut className="w-6 h-6" /></button>
                </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
