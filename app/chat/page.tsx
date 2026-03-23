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
  Shield,
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
  Video,
  MoreHorizontal,
  Share2,
  Check
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
  const [chatType, setChatType] = useState<'ai' | 'people' | 'feed'>('ai')
  const [posts, setPosts] = useState<any[]>([])
  const [stories, setStories] = useState<any[]>([])
  const [isFeedLoading, setIsFeedLoading] = useState(false)

  // AI Chat States
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [mode, setMode] = useState<'romantic' | 'friendly' | 'flirty' | 'private'>('friendly')

  // People Chat States
  const [peopleConversations, setPeopleConversations] = useState<any[]>([])
  const [activePeopleConversationId, setActivePeopleConversationId] = useState<string | null>(null)
  const [peopleMessages, setPeopleMessages] = useState<any[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [peopleTab, setPeopleTab] = useState<'messages' | 'discover' | 'requests'>('discover')
  const [isTyping, setIsTyping] = useState(false)
  const [isAdultVerified, setIsAdultVerified] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [selectedProfileData, setSelectedProfileData] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [outboundFollows, setOutboundFollows] = useState<any[]>([])

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [image, setImage] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

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
        setUser({
          id: data.user.userId,
          email: data.user.email,
          name: data.user.name,
          plan: data.profile.plan,
          referral_code: data.profile.referral_code,
          bio: data.profile.bio,
          birth_date: data.profile.birth_date,
          country: data.profile.country
        })
        setCredits(data.profile.credits)
        setUserRole(data.profile.role || 'user')
        setIsAdultVerified(data.profile.is_adult_verified || false)

        // Check for basic onboarding completion (Redirection to Galaxy Onboarding)
        if (!data.profile.bio || !data.profile.birth_date || !data.profile.full_name || !data.profile.phone_number) {
            router.push('/onboarding')
            return
        }

        // Fetch conversations
        await fetchConversations()
        await fetchPeopleConversations()
        await fetchUsers()
        await fetchFeed()
        await fetchRequests()
      } catch (e) {
        console.error('Chat init error:', e)
      }
    }
    initChat()
  }, [])

  // Call referral application once
  useEffect(() => {
    const handleReferral = async () => {
      const pendingCode = localStorage.getItem('referral_code')
      if (pendingCode && user?.id) {
        try {
          const res = await fetch('/api/referral/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referralCode: pendingCode })
          })
          const data = await res.json()
          if (data.success) {
            toast.success('Referral Success!', {
              description: 'You earned +10 credits for joining via referral 💖',
            })
            // Refresh credits
            const resRef = await fetch('/api/profile')
            const dataRef = await resRef.json()
            setCredits(dataRef.profile.credits)
          }
          // Remove anyway whether success or fail to avoid constant retry
          localStorage.removeItem('referral_code')
        } catch (e) {
          console.error('Referral application failed:', e)
        }
      }
    }
    if (user?.id) handleReferral()
  }, [user?.id])

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
      
      const resF = await fetch('/api/social/follow')
      const dataF = await resF.json()
      const follows = dataF.follows || []
      setOutboundFollows(follows)

      const mapped = (data.users || []).map((u: any) => {
          const f = follows.find((f: any) => f.following_id === u.id)
          return {
              ...u,
              isFollowing: !!f,
              followStatus: f?.status
          }
      })
      setAvailableUsers(mapped)
    } catch (e) {
      console.error('Fetch users error:', e)
    }
  }

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/social/requests')
      const data = await res.json()
      if (data.requests) setPendingRequests(data.requests)
    } catch (e) { }
  }

  const handleRequestAction = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch('/api/social/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchRequests()
        fetchUsers()
        fetchPeopleConversations()
      }
    } catch (e) {
      toast.error('Action failed')
    }
  }

  const fetchPeopleMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/people-chat/messages?conversation_id=${convId}`)
      const data = await res.json()
      setPeopleMessages(data.messages || [])
      
      // Mark as seen
      await fetch('/api/people-chat/messages/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: convId })
      })
    } catch (e) {
      console.error('Fetch people messages error:', e)
    }
  }

  const handleStartPeopleChat = async (targetUserId: string) => {
    // Check if follow is accepted
    const follow = outboundFollows.find(f => f.following_id === targetUserId)
    if (!follow || follow.status !== 'accepted') {
        toast.error('Follow request required', {
            description: 'You must be accepted before you can whisper to this soul.'
        })
        return
    }

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
        setPeopleTab('messages') // Switch to messages tab when starting chat
        setSelectedProfileId(null) // Close profile if open
      }
    } catch (e) {
      toast.error('Could not start chat')
    }
  }

  const handleFollow = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchUsers() // Refresh list with status
      }
    } catch (e) {
      toast.error('Follow failed')
    }
  }

  const handleUnfollow = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/social/follow?userId=${targetUserId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Unfollowed')
        fetchUsers() 
        if (selectedProfileId === targetUserId) fetchUserProfile(targetUserId)
      }
    } catch (e) {
      toast.error('Unfollow failed')
    }
  }

  const fetchUserProfile = async (id: string) => {
    try {
      setLoadingProfile(true)
      const res = await fetch(`/api/social/profile?userId=${id}`)
      const data = await res.json()
      if (data.profile) {
          setSelectedProfileData(data.profile)
          setSelectedProfileId(id)
      }
    } catch (e) {
      toast.error('Failed to load profile')
    } finally {
        setLoadingProfile(false)
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
            setPeopleMessages((prev) => {
              if (prev.some(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${activePeopleConversationId}`,
          },
          (payload) => {
            setPeopleMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m))
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

  const handleModeChange = (newMode: any) => {
    if (newMode === 'private') {
      if (user?.plan === 'free' && userRole !== 'admin') {
        toast.error('Premium Mode Required', {
          description: 'Upgrade your plan to unlock private conversations 🌙',
        })
        return
      }
      if (!isAdultVerified) {
        setShowAgeVerification(true)
        return
      }
    }
    setMode(newMode)
  }

  const handleVerifyAge = async () => {
    try {
      const res = await fetch('/api/profile/verify-age', { method: 'POST' })
      if (!res.ok) throw new Error('Verification failed')
      setIsAdultVerified(true)
      setShowAgeVerification(false)
      setMode('private')
      toast.success('Age verified! Access granted 🌙')
    } catch (e) {
      toast.error('Something went wrong')
    }
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

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true)
      const lastContext = chatType === 'ai' ? messages : peopleMessages
      const context = lastContext.slice(-5).map(m => ({
        role: (m.role === 'user' || m.sender_id === user?.id) ? 'user' : 'assistant',
        content: m.content
      }))
      
      const res = await fetch('/api/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: context })
      })
      const data = await res.json()
      if (data.suggestions) setSuggestions(data.suggestions)
    } catch (e) {
      toast.error('Could not get suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleApplySuggestion = (s: string) => {
    setInput(s)
    setSuggestions([])
  }

  const updateOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = e.target as any
    const bio = target.bio.value
    const country = target.country.value
    const birthDate = target.birthDate.value

    try {
        const res = await fetch('/api/profile/update', {
            method: 'POST',
            body: JSON.stringify({ bio, country, birth_date: birthDate })
        })
        if (res.ok) {
            setShowOnboarding(false)
            toast.success('Welcome to Lanora! 💖')
        }
    } catch (e) {
        toast.error('Failed to save profile')
    }
  }

  const fetchFeed = async () => {
    try {
      setIsFeedLoading(true)
      const [resPosts, resStories] = await Promise.all([
        fetch('/api/feed/posts'),
        fetch('/api/feed/stories')
      ])
      const dataP = await resPosts.json()
      const dataS = await resStories.json()
      setPosts(dataP.posts || [])
      setStories(dataS.stories || [])
    } catch (e) {
       console.error('Feed error:', e)
    } finally {
       setIsFeedLoading(false)
    }
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
    <div className="flex flex-col md:flex-row h-screen bg-[#0b0b0f] overflow-hidden text-slate-200 font-['Outfit'] relative">
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

      {/* Sidebar Desktop & Tablet */}
      <aside className="hidden md:flex flex-col md:w-56 lg:w-64 h-full border-r border-white/5 glass p-5 z-20 relative shrink-0">
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${chatType === 'ai' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            <Heart className={`w-3 h-3 ${chatType === 'ai' ? 'text-pink-500' : ''}`} />
            AI
          </button>
          <button
            onClick={() => setChatType('people')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${chatType === 'people' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            <Users className={`w-3 h-3 ${chatType === 'people' ? 'text-purple-500' : ''}`} />
            People
          </button>
          <button
            onClick={() => setChatType('feed')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all ${chatType === 'feed' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
          >
            <Sparkles className={`w-3 h-3 ${chatType === 'feed' ? 'text-indigo-400' : ''}`} />
            Feed
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
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all text-left group ${activeConversationId === conv.id
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
            {/* Instagram Style DM/Discover Tabs */}
            <div className="flex px-4 gap-4 mb-4 mt-2">
                <button 
                  onClick={() => setPeopleTab('messages')}
                  className={`text-[10px] font-bold uppercase tracking-widest ${peopleTab === 'messages' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600'}`}
                >
                  Messages
                </button>
                <button 
                  onClick={() => setPeopleTab('discover')}
                  className={`text-[10px] font-bold uppercase tracking-widest ${peopleTab === 'discover' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600'}`}
                >
                  Discover
                </button>
                <button 
                  onClick={() => setPeopleTab('requests')}
                  className={`text-[10px] font-bold uppercase tracking-widest ${peopleTab === 'requests' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600'}`}
                >
                  Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </button>
            </div>

            <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar pr-1">
              {peopleTab === 'messages' ? (
                <div className="space-y-1">
                  {peopleConversations.length === 0 ? (
                      <div className="text-center py-10 px-4">
                          <p className="text-xs text-slate-600 font-medium">No messages yet. Go explore!</p>
                          <button onClick={() => setPeopleTab('discover')} className="mt-4 text-[10px] uppercase font-bold text-purple-400">Discover People</button>
                      </div>
                  ) : (
                    peopleConversations.map((conv) => {
                      const otherParticipant = conv.chat_participants?.find((p: any) => p.user_id !== user?.id);
                      const lastMsg = conv.last_message; // Assuming we add this later or handle better
                      return (
                        <button
                          key={conv.id}
                          onClick={() => {
                            setActivePeopleConversationId(conv.id)
                            fetchPeopleMessages(conv.id)
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-all text-left group ${activePeopleConversationId === conv.id
                              ? 'bg-white/10 text-white border border-white/5'
                              : 'text-slate-500 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center shrink-0 shadow-lg ${activePeopleConversationId === conv.id ? 'border-purple-500/50' : ''}`}>
                            {otherParticipant?.profiles?.avatar_url ? (
                                <img src={otherParticipant.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 opacity-40" />
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className="truncate font-bold text-slate-200">{otherParticipant?.profiles?.name || 'Soul Mate'}</span>
                                <span className="text-[9px] text-slate-600 uppercase font-black">{conv.created_at ? new Date(conv.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">Click to continue our talk...</div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : peopleTab === 'requests' ? (
                <div className="space-y-3 px-4 py-2 flex-grow overflow-y-auto">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-10"><p className="text-xs text-slate-600 font-medium italic">No pending signals</p></div>
                  ) : (
                    pendingRequests.map(r => (
                      <div key={r.id} className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-3 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 overflow-hidden border border-white/10 flex items-center justify-center">
                            {r.profiles?.avatar_url ? (
                                <img src={r.profiles.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-4 h-4 text-slate-500 opacity-40" />
                            )}
                          </div>
                          <span className="text-xs font-bold text-white/90 truncate">{r.profiles?.name || 'Someone'}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleRequestAction(r.id, 'accept')} className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-500 text-[10px] font-bold uppercase hover:bg-green-500/30 transition-all border border-green-500/10">Accept</button>
                          <button onClick={() => handleRequestAction(r.id, 'reject')} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-500 text-[10px] font-bold uppercase hover:bg-red-500/30 transition-all border border-red-500/10">Reject</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {availableUsers.map((u) => (
                    <div
                      key={u.id}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-transparent group hover:bg-white/5"
                    >
                      <button onClick={() => fetchUserProfile(u.id)} className="w-10 h-10 rounded-full bg-pink-500/5 border border-white/5 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform">
                        {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-pink-500/50" />
                        )}
                        {u.last_seen && (new Date().getTime() - new Date(u.last_seen).getTime() < 5 * 60 * 1000) && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-[#0b0b0f] z-10" />
                        )}
                      </button>
                      
                      <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => fetchUserProfile(u.id)}>
                        <div className="flex items-center gap-1.5">
                           <span className="truncate font-bold text-white/90 text-sm group-hover:text-pink-400 transition-colors">{u.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate flex items-center gap-2">
                           {u.birth_date ? `${new Date().getFullYear() - new Date(u.birth_date).getFullYear()} years` : 'Age hidden'}
                           {u.country && (
                               <>
                                 <span className="w-1 h-1 rounded-full bg-slate-700" />
                                 <span>{u.country}</span>
                               </>
                           )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                          <button
                            onClick={() => {
                                if (u.followStatus === 'accepted' || u.followStatus === 'pending') handleUnfollow(u.id)
                                else handleFollow(u.id)
                            }}
                            className={`p-2 rounded-lg transition-all ${u.followStatus === 'accepted' ? 'bg-green-500/10 text-green-500' : u.followStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/20'}`}
                          >
                            {u.followStatus === 'accepted' ? '✅' : u.followStatus === 'pending' ? '⏳' : <UserPlus className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleStartPeopleChat(u.id)}
                            className={`p-2 rounded-lg transition-all ${u.followStatus === 'accepted' ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'opacity-20 grayscale cursor-not-allowed'}`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Section */}
        <div className="pt-6 border-t border-white/5 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-20"><Zap className="w-8 h-8 rotate-12" /></div>
            <div className="relative z-10 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Invite & Earn</div>
              <div className="text-xs font-bold text-white/80 leading-relaxed">Share Lanora & get <span className="text-indigo-400">+10 Credits</span> for every new soul.</div>

              <button
                onClick={() => {
                  const link = `${window.location.origin}/login?ref=${user?.referral_code || ''}`
                  navigator.clipboard.writeText(link)
                  toast.success('Link copied! 💖')
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-[11px] font-bold transition-all border border-indigo-500/10"
              >
                Copy Invite Link
              </button>
            </div>
          </div>
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
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 glass shrink-0 relative z-20">
          <button className="md:hidden p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div 
                className="relative cursor-pointer group"
                onClick={() => {
                   if (chatType === 'people' && activePeopleConversationId) {
                       const otherId = peopleConversations.find(c => c.id === activePeopleConversationId)?.chat_participants?.find((p: any) => p.user_id !== user?.id)?.user_id
                       if (otherId) fetchUserProfile(otherId)
                   }
                }}
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/10 to-purple-500/10 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform overflow-hidden shadow-xl ${chatType === 'ai' ? 'rounded-xl' : 'rounded-full'}`}>
                  {chatType === 'ai' ? (
                      <Sparkles className="w-4.5 h-4.5 md:w-5 md:h-5 text-pink-400" />
                  ) : (
                      peopleConversations.find(c => c.id === activePeopleConversationId)?.chat_participants?.find((p: any) => p.user_id !== user?.id)?.profiles?.avatar_url ? (
                          <img src={peopleConversations.find(c => c.id === activePeopleConversationId)?.chat_participants?.find((p: any) => p.user_id !== user?.id).profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                          <User className="w-5 h-5 text-purple-400 opacity-40 mx-auto" />
                      )
                  )}
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-slate-950 absolute -bottom-0.5 -right-0.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] md:text-[15px] font-bold text-white tracking-tight leading-none mb-1">
                  {chatType === 'ai' ? 'Lanora AI' : (peopleConversations.find(c => c.id === activePeopleConversationId)?.chat_participants?.find((p: any) => p.user_id !== user?.id)?.profiles?.name || 'Soul Mate')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    {chatType === 'ai' ? (loading ? 'thinking...' : 'online') : (isTyping ? 'typing...' : 'online')}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Mode Selector (Only in AI mode) */}
            {chatType === 'ai' && (
              <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 ml-0 md:ml-4 hidden sm:flex">
                {[
                  { id: 'friendly', label: '😊' },
                  { id: 'romantic', label: '💕' },
                  { id: 'flirty', label: '😉' },
                  { id: 'private', label: '🔥', tooltip: 'Private mode' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleModeChange(m.id as any)}
                    title={m.tooltip}
                    className={`w-8 h-7 md:w-10 md:h-8 rounded-full flex items-center justify-center transition-all ${mode === m.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="text-xs md:text-sm">{m.label}</span>
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
        <div className="flex-1 overflow-y-auto custom-scrollbar pt-4 md:pt-8 pb-32 md:pb-40 px-3 md:px-0">
          <div className="max-w-[850px] mx-auto px-4 md:px-6 space-y-4">
            {chatType === 'feed' ? (
              <div className="space-y-8 py-6">
                {/* Stories Bar */}
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
                  <button className="flex-shrink-0 flex flex-col items-center gap-2 group">
                    <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-purple-600 relative overflow-hidden group-hover:scale-105 transition-transform">
                       <div className="w-full h-full rounded-full border-2 border-[#0b0b0f] bg-zinc-800 flex items-center justify-center">
                         <Plus className="w-6 h-6 text-pink-400" />
                       </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">Your Story</span>
                  </button>
                  {stories.map((s, idx) => (
                    <button key={s.id || idx} className="flex-shrink-0 flex flex-col items-center gap-2 group text-center">
                      <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 to-purple-600 group-hover:scale-105 transition-transform">
                        <div className="w-full h-full rounded-full border-2 border-[#0b0b0f] overflow-hidden">
                           <img src={s.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 w-16 truncate">{s.profiles?.name || 'Someone'}</span>
                    </button>
                  ))}
                </div>

                {/* Create Post Card */}
                <div className="glass p-6 rounded-[32px] border border-white/5 space-y-4">
                   <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center shrink-0">
                         <User className="w-5 h-5 text-slate-500" />
                      </div>
                      <textarea
                        placeholder="What's your spark today? ✨"
                        className="flex-grow bg-transparent border-none outline-none text-sm text-slate-300 placeholder:text-slate-600 min-h-[60px] resize-none pt-2"
                      />
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                         <button className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 transition-colors">
                            <Camera className="w-4 h-4" />
                         </button>
                         <button className="p-2.5 rounded-xl hover:bg-white/5 text-slate-500 transition-colors">
                            <ImageIcon className="w-4 h-4" />
                         </button>
                      </div>
                      <button className="px-6 py-2 rounded-full bg-white/10 text-[11px] font-bold text-white hover:bg-white/20 transition-all border border-white/5">
                        Post Life
                      </button>
                   </div>
                </div>

                {/* Social Feed List */}
                <div className="space-y-6 pb-20">
                  {isFeedLoading ? (
                    <div className="text-center py-20 text-slate-600 animate-pulse">Gathering stars...</div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-slate-600 italic">No lights in the galaxy yet. Be the first?</div>
                  ) : posts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-[24px] md:rounded-[32px] border border-white/5 overflow-hidden group"
                    >
                      <div className="p-4 md:p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                               <h4 className="text-sm font-bold text-white/90">{post.profiles?.name}</h4>
                               <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                  <span>{post.profiles?.country}</span>
                                  <span>•</span>
                                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                               </div>
                            </div>
                          </div>
                          <button className="p-2 rounded-lg hover:bg-white/5 text-slate-500 opacity-0 group-hover:opacity-100 transition-all">
                             <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[14px] leading-relaxed text-slate-300">{post.content}</p>
                        {post.image_url && (
                          <div className="rounded-2xl overflow-hidden border border-white/5">
                             <img src={post.image_url} className="w-full object-cover max-h-[400px]" />
                          </div>
                        )}
                        <div className="flex items-center gap-6 pt-2">
                           <button className="flex items-center gap-2 text-slate-500 hover:text-pink-400 transition-colors">
                              <Heart className="w-4 h-4" />
                              <span className="text-[11px] font-bold">Spark</span>
                           </button>
                           <button className="flex items-center gap-2 text-slate-500 hover:text-purple-400 transition-colors">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-[11px] font-bold">Reply</span>
                           </button>
                           <button className="flex items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors ml-auto">
                              <Share2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : chatType === 'ai' ? (
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
                    <div className={`px-4.5 py-3 rounded-[18px] max-w-[85%] md:max-w-[65%] text-[14px] md:text-[15px] leading-[1.6] ${m.role === 'user' ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/10' : 'chat-bubble-ai text-slate-300'}`}>
                      <div className="space-y-4">
                        <div className="whitespace-pre-wrap">{m.content.includes('JSON_START') ? m.content.split('JSON_START')[0].trim() : m.content}</div>
                        {(m.images || (m.content.includes('JSON_START') ? (() => { try { return JSON.parse(m.content.split('JSON_START')[1].split('JSON_END')[0]).images } catch (e) { return [] } })() : []))?.length > 0 && (
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
                    className={`flex flex-col ${m.sender_id === user?.id ? 'items-end' : 'items-start'} mb-4`}
                  >
                    <div className={`flex gap-3 ${m.sender_id === user?.id ? 'flex-row-reverse' : ''} w-full`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/5 ${m.sender_id === user?.id ? 'bg-zinc-800' : 'bg-purple-500/5'}`}>
                        {m.sender_id === user?.id ? <User className="w-4 h-4 text-slate-500" /> : <MessageCircle className="w-4 h-4 text-purple-400/60" />}
                      </div>
                      <div className={`px-4.5 py-3 rounded-[18px] max-w-[85%] md:max-w-[65%] text-[14px] md:text-[15px] leading-[1.6] ${m.sender_id === user?.id ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/10' : 'bg-white/5 text-slate-300 border border-white/5'}`}>
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                    </div>
                    {m.sender_id === user?.id && i === peopleMessages.length - 1 && (
                      <div className="text-[10px] text-slate-600 mt-1 mr-11">
                        {m.is_seen ? `Seen` : 'Sent'}
                      </div>
                    )}
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

            {/* In-Chat Ad System for Free Users */}
            {user?.plan === 'free' && messages.length > 0 && messages.length % 5 === 0 && (
              <div className="my-8 p-6 rounded-[32px] glass border border-white/5 relative overflow-hidden group text-center space-y-4">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-indigo-500/5 opacity-50" />
                <div className="relative z-10 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#ff4d8d]/60 mb-1 flex items-center justify-center gap-2">
                    <Zap className="w-3 h-3" /> ADVERTISEMENT
                  </div>
                  <h4 className="text-lg font-bold">Unleash Full Potential 🔥</h4>
                  <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">Upgrade to Premium for unlimited private mode, no ads, and deeper connections.</p>
                  <Link href="/" className="inline-block mt-4 px-6 py-2 rounded-full romantic-gradient text-white text-[11px] font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-all">
                    Explore Plans
                  </Link>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full z-30 pt-4 pb-6 md:pb-10 bg-gradient-to-t from-[#0b0b0f] via-[#0b0b0f]/95 to-transparent">
          <div className="max-w-[850px] mx-auto px-4 md:px-6">
            <form onSubmit={handleSend} className="relative group">
              {/* Suggestions UI */}
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full mb-6 left-0 w-full flex flex-wrap gap-2"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplySuggestion(s)}
                        className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-xl text-[12px] font-bold text-white hover:bg-white/20 transition-all shadow-xl"
                      >
                        {s}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

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
                <div className="absolute left-1.5 md:left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 md:gap-1">
                  <button
                    type="button"
                    onClick={fetchSuggestions}
                    disabled={loadingSuggestions}
                    className={`p-2 rounded-full hover:bg-white/10 transition-all ${loadingSuggestions ? 'animate-pulse text-pink-400' : 'text-slate-500'}`}
                  >
                    <Sparkles className="w-4.5 h-4.5 md:w-5 md:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-white/10 text-slate-500 transition-all hidden sm:flex"
                  >
                    <Camera className="w-4.5 h-4.5 md:w-5 md:h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-white/10 text-slate-500 transition-all"
                  >
                    <ImageIcon className="w-4.5 h-4.5 md:w-5 md:h-5" />
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
                  className="w-full bg-white/[0.03] border border-white/10 rounded-full py-4 pl-12 md:pl-24 pr-14 md:pr-16 text-[14px] md:text-[15px] font-medium resize-none outline-none focus:bg-white/[0.05] focus:border-pink-500/30 transition-all custom-scrollbar backdrop-blur-xl min-h-[56px] flex items-center text-slate-200"
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
      {/* Onboarding Modal */}
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
              className="fixed inset-y-0 left-0 w-72 md:w-80 bg-[#0f0a14] border-r border-white/10 z-50 p-6 md:p-8 flex flex-col"
            >
              <button onClick={() => setSidebarOpen(false)} className="absolute top-8 right-8 p-3 bg-white/5 rounded-full text-zinc-400 hover:text-[#ff4d8d] transition-colors">
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff4d8d] to-[#9b5cff] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight text-white/90">Lanora AI</span>
              </div>

              {/* Chat Type Toggle Mobile */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-2xl border border-white/5 mb-6">
                <button
                  onClick={() => { setChatType('ai'); setSidebarOpen(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${chatType === 'ai' ? 'bg-white/10 text-white' : 'text-slate-600'}`}
                >
                  <Heart className={`w-3 h-3 ${chatType === 'ai' ? 'text-pink-500' : ''}`} />
                  AI
                </button>
                <button
                  onClick={() => { setChatType('people'); setSidebarOpen(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${chatType === 'people' ? 'bg-white/10 text-white' : 'text-slate-600'}`}
                >
                  <Users className={`w-3 h-3 ${chatType === 'people' ? 'text-purple-500' : ''}`} />
                  People
                </button>
                <button
                  onClick={() => { setChatType('feed'); setSidebarOpen(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${chatType === 'feed' ? 'bg-white/10 text-white' : 'text-slate-600'}`}
                >
                  <Sparkles className={`w-3 h-3 ${chatType === 'feed' ? 'text-indigo-400' : ''}`} />
                  Feed
                </button>
              </div>

              <div className="flex-grow space-y-6 overflow-y-auto custom-scrollbar pr-1">
                {chatType === 'ai' ? (
                  <>
                    <button
                      onClick={() => { handleNewChat(); setSidebarOpen(false); }}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold text-sm"
                    >
                      <Plus className="w-5 h-5" />
                      New AI Chat
                    </button>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-4">Recents</span>
                      {conversations.slice(0, 10).map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => switchConversation(conv.id)}
                          className={`w-full flex items-center gap-4 px-5 py-3 rounded-[20px] transition-all font-bold text-sm ${activeConversationId === conv.id ? 'bg-white/10 text-white' : 'text-slate-500'}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${activeConversationId === conv.id ? 'bg-pink-500' : 'bg-slate-700'}`} />
                          <span className="truncate">{conv.title}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : chatType === 'people' ? (
                  <div className="space-y-4">
                     <div className="flex gap-4 px-2">
                        <button onClick={() => setPeopleTab('messages')} className={`text-[10px] font-black uppercase tracking-widest ${peopleTab === 'messages' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600'}`}>Messages</button>
                        <button onClick={() => setPeopleTab('discover')} className={`text-[10px] font-black uppercase tracking-widest ${peopleTab === 'discover' ? 'text-white border-b-2 border-purple-500 pb-1' : 'text-slate-600'}`}>Discover</button>
                     </div>
                     <div className="space-y-1">
                        {peopleTab === 'messages' ? (
                           peopleConversations.length === 0 ? (
                              <div className="text-center py-10 px-4">
                                  <p className="text-xs text-slate-600 font-medium">No messages yet.</p>
                              </div>
                           ) : (
                              peopleConversations.map(conv => {
                                 const otherParticipant = conv.chat_participants?.find((p: any) => p.user_id !== user?.id);
                                 return (
                                    <button key={conv.id} onClick={() => { setActivePeopleConversationId(conv.id); fetchPeopleMessages(conv.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-2xl ${activePeopleConversationId === conv.id ? 'bg-white/10' : ''}`}>
                                       <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                                           {otherParticipant?.profiles?.avatar_url ? <img src={otherParticipant.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5 opacity-40 mx-auto mt-2" />}
                                       </div>
                                       <div className="text-left text-xs font-bold text-white truncate flex-1">{otherParticipant?.profiles?.name || 'Soul Mate'}</div>
                                    </button>
                                 )
                              })
                           )
                        ) : (
                           availableUsers.map(u => (
                              <button key={u.id} onClick={() => { fetchUserProfile(u.id); setSidebarOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-left">
                                 <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                                     {u.avatar_url && <img src={u.avatar_url} className="w-full h-full object-cover" />}
                                 </div>
                                 <div className="flex-1">
                                    <div className="text-xs font-bold text-white">{u.name}</div>
                                    <div className="text-[10px] text-slate-500">{u.country || 'Galaxy'}</div>
                                 </div>
                              </button>
                           ))
                        )}
                     </div>
                  </div>
                ) : (
                   <div className="space-y-4">
                      <button onClick={() => { setChatType('feed'); setSidebarOpen(false); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-[24px] bg-white/5 text-white font-bold text-sm">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        Explore Feed
                      </button>
                   </div>
                )}
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
      {/* Age Verification Modal */}
      <AnimatePresence>
        {showAgeVerification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm p-8 rounded-[32px] glass border border-white/10 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-pink-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Safety Confirmation</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Private mode contains mature themes. Please confirm you are 18 or older to proceed. 🌙
                </p>
              </div>
              <div className="space-y-4 pt-4">
                <button
                  onClick={handleVerifyAge}
                  className="w-full py-4 rounded-full bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-all shadow-lg"
                >
                  I am 18+ • Unlock 🔥
                </button>
                <button
                  onClick={() => setShowAgeVerification(false)}
                  className="w-full py-4 rounded-full bg-white/5 text-zinc-500 font-bold text-sm hover:bg-white/10 transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Social Profile Modal */}
      <AnimatePresence>
        {selectedProfileId && selectedProfileData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="w-full max-w-sm overflow-hidden rounded-[40px] glass border border-white/10 shadow-2xl relative"
             >
                <button 
                  onClick={() => { setSelectedProfileId(null); setSelectedProfileData(null); }}
                  className="absolute top-6 right-6 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Profile Header Background */}
                <div className="h-32 bg-gradient-to-br from-pink-500/20 to-purple-600/20 relative">
                   <div className="absolute inset-0 bg-romantic-glow opacity-30" />
                </div>

                <div className="px-8 pb-8 -mt-12 relative z-10 text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-[#0b0b0f] mx-auto overflow-hidden bg-zinc-800 shadow-xl mb-4">
                        {selectedProfileData.avatar_url ? (
                            <img src={selectedProfileData.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-10 h-10 text-slate-600 mt-6 mx-auto" />
                        )}
                    </div>

                    <h2 className="text-2xl font-bold text-white">{selectedProfileData.name}</h2>
                    <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                        {selectedProfileData.country && <span>{selectedProfileData.country}</span>}
                        {selectedProfileData.birth_date && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span>{new Date().getFullYear() - new Date(selectedProfileData.birth_date).getFullYear()} years</span>
                            </>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex justify-center gap-8 mt-6 py-4 border-y border-white/5">
                        <div className="text-center">
                            <div className="text-lg font-bold text-white leading-none">{selectedProfileData.followers || 0}</div>
                            <div className="text-[9px] uppercase font-black tracking-widest text-slate-600 mt-1">Followers</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-white leading-none">{selectedProfileData.following || 0}</div>
                            <div className="text-[9px] uppercase font-black tracking-widest text-slate-600 mt-1">Following</div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="mt-6 text-sm text-slate-400 leading-relaxed italic px-2">
                        "{selectedProfileData.bio || 'This soul hasn\'t shared their story yet...'}"
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <button 
                          onClick={() => {
                              if (selectedProfileData.isFollowing) handleUnfollow(selectedProfileData.id)
                              else handleFollow(selectedProfileData.id)
                          }}
                          className={`h-12 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${selectedProfileData.isFollowing ? 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10' : 'romantic-gradient text-white shadow-lg shadow-pink-500/20 hover:scale-[1.02]'}`}
                        >
                          {selectedProfileData.followStatus === 'pending' ? 'Pending' : (selectedProfileData.isFollowing ? 'Following' : 'Follow')}
                        </button>
                        <button 
                          onClick={() => handleStartPeopleChat(selectedProfileData.id)}
                          className="h-12 rounded-2xl bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-[0.98]"
                        >
                          Message
                        </button>
                    </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
