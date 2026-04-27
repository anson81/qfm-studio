import { useState, useRef, useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { Send, Bot, User, Loader2 } from 'lucide-react'

export default function AIAssistant() {
  const [messages, setMessages] = useState<any[]>([{ role: 'system', content: 'I am your AI Marketing Assistant. Ask me anything about marketing strategy, content ideas, or how to use the studio.' }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    if (!input.trim()) return
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await supabase.functions.invoke('ai-chat', { body: { messages: [...messages, userMsg] } })
      if (data?.message) setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      else setMessages(prev => [...prev, { role: 'assistant', content: 'No response from assistant.' }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message }])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-3xl font-bold">AI Marketing Assistant</h1>
      <Card className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role !== 'user' && <Bot className="w-6 h-6 shrink-0 mt-1 text-primary" />}
              <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.content}
              </div>
              {m.role === 'user' && <User className="w-6 h-6 shrink-0 mt-1" />}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3"><Bot className="w-6 h-6 text-primary" /><div className="bg-muted rounded-lg px-4 py-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /></div></div>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about marketing..." onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <Button onClick={handleSend} disabled={loading || !input}><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  )
}
