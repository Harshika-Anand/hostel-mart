// File: src/components/OrderChat.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  message: string
  senderRole: string
  createdAt: string
  isRead: boolean
  sender: {
    id: string
    name: string
    role: string
  }
}

interface OrderChatProps {
  orderId: string
  customerName?: string
}

export default function OrderChat({ orderId, customerName }: OrderChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  // Quick reply templates
  const quickReplies = isAdmin
    ? [
        "Order confirmed! Preparing now 👨‍🍳",
        "Your order is ready for pickup! 🎉",
        "Coming to your room in 2 minutes 🏃",
        "Item added to your order ✅",
        "Sorry, that item is out of stock 😔"
      ]
    : [
        "How long will it take? ⏰",
        "Can I change my delivery room?",
        "Please add extra items to my order",
        "Can you make it less spicy? 🌶️",
        "Thanks! 😊"
      ]

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
        
        // Mark messages as read
        if (data.some((m: Message) => !m.isRead && m.sender.id !== session?.user?.id)) {
          await fetch(`/api/orders/${orderId}/messages`, {
            method: 'PATCH'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  // Send message
  const sendMessage = async (text?: string) => {
    const messageText = text || newMessage.trim()
    if (!messageText) return

    setSending(true)
    setError('')

    try {
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      })

      if (response.ok) {
        setNewMessage('')
        setShowQuickReplies(false)
        await fetchMessages()
        inputRef.current?.focus()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send message')
      }
    } catch (err) {
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleQuickReply = (reply: string) => {
    sendMessage(reply)
  }

  // Initial load
  useEffect(() => {
    fetchMessages()
  }, [orderId])

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [orderId])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading chat...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[500px] sm:h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {isAdmin ? `Chat with ${customerName || 'Customer'}` : 'Chat with Admin'}
            </h3>
            <p className="text-blue-100 text-sm">Order #{orderId.slice(-8)}</p>
          </div>
          <div className="text-xs bg-blue-500 px-3 py-1 rounded-full">
            💬 {messages.length} messages
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-3">💬</div>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {isAdmin ? 'Customer will see messages here' : 'Send a message to get started'}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isMine = msg.sender.id === session?.user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[75%] sm:max-w-[70%]`}>
                    {!isMine && (
                      <div className="text-xs text-gray-500 mb-1 ml-1">
                        {msg.sender.name}
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                    <div
                      className={`text-xs text-gray-500 mt-1 ${
                        isMine ? 'text-right mr-1' : 'ml-1'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="border-t bg-gray-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Quick Replies</span>
            <button
              onClick={() => setShowQuickReplies(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                disabled={sending}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 disabled:opacity-50 transition"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 bg-white rounded-b-lg">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-2">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className="flex-shrink-0 bg-gray-100 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-200 transition"
            title="Quick replies"
          >
            ⚡
          </button>
          
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
            disabled={sending}
          />
          
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="flex-shrink-0 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
        
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}