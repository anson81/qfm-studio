import { useState, useRef } from 'react'
import { loadBusinessProfile, getPromptPrefix } from '../lib/businessContext'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { apiClient } from '../lib/api'
import { toast } from 'sonner'
import { Bot, Loader2, Send, User } from 'lucide-react'

const LANGUAGES = [
  { value: 'ms', label: 'Bahasa Malaysia' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文 (Mandarin)' },
  { value: 'zh-hk', label: '粤语 (Cantonese)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
]

const LANGUAGE_NAMES: Record<string, string> = {
  'ms': 'Bahasa Malaysia',
  'en': 'English',
  'zh': '中文 (Mandarin)',
  'zh-hk': '粤语 (Cantonese)',
  'ta': 'தமிழ் (Tamil)',
}

export default function AIAssistant() {
  const biz = loadBusinessProfile()
  const [messages, setMessages] = useState<{role: string; content: string}[]>([
    { role: 'assistant', content: `Hi! I'm your AI marketing assistant${biz?.business_name ? ' for ' + biz.business_name : ''}. Ask me anything about marketing, content strategy, platform growth, or ${biz?.business_category || 'e-commerce'} trends!` }
  ])
  const [input, setInput] = useState('')
  const [dialogueLanguage, setDialogueLanguage] = useState('ms')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  async function handleSend() {
    if (!apiClient.hasKIEKey()) { toast.error('Add your KIE.API key in Settings first'); return }
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)
    try {
      const chatHistory = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      const res = await apiClient.generateTextSmart({
        system_prompt: `You are an expert marketing assistant for ${getPromptPrefix(biz)}. Language: ${LANGUAGE_NAMES[dialogueLanguage]}. All content MUST be in ${LANGUAGE_NAMES[dialogueLanguage]}. You specialize in: growth strategy, e-commerce optimization, content creation, live selling, and market insights. Respond concisely and practically. Give actionable advice with specific numbers and steps.`,
        user_message: JSON.stringify([...chatHistory, { role: 'user', content: userMsg }]).slice(-2000),
        model: 'claude-sonnet-4-5'
      })
      const text = res.result?.choices?.[0]?.message?.content || res.result?.text || res.data?.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.'
      setMessages(prev => [...prev, { role: 'assistant', content: text }])
    } catch (err: any) {
      toast.error(err.message || 'Failed to respond')
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally { setLoading(false) }
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">Your fashion marketing advisor</p>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-primary text-white' : 'bg-sidebar border border-sidebar-border text-white'}`}>
                <div className="flex items-start gap-2">
                  {m.role === 'assistant' && <Bot className="w-4 h-4 mt-0.5 shrink-0" />}
                  {m.role === 'user' && <User className="w-4 h-4 mt-0.5 shrink-0" />}
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                </div>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="bg-sidebar border border-sidebar-border p-3 rounded-lg"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div></div>}
          <div ref={chatEndRef} />
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <textarea className="flex-1 p-3 bg-sidebar border border-sidebar-border rounded-lg text-white resize-none" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Ask about fashion marketing..." />
        <Button onClick={handleSend} disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  )
}