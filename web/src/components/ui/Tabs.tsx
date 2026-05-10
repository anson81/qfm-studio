import { useState } from 'react'
import { cn } from './cn'
import * as React from 'react'
export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [val, setVal] = useState(defaultValue)
  return <TabsContext.Provider value={{ value: val, setValue: setVal }}>{children}</TabsContext.Provider>
}
const TabsContext = React.createContext<any>(null)

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}>{children}</div>
}
export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)
  return (
    <button onClick={() => ctx.setValue(value)} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all', ctx.value === value ? 'bg-background text-foreground shadow-sm' : 'hover:bg-muted/50')}>
      {children}
    </button>
  )
}
export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return <div className="mt-2 ring-offset-background">{children}</div>
}
