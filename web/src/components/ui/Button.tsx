import { cn } from './cn'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}
export function Button({ children, variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  const variants = {
    default: 'bg-primary text-white hover:bg-primary-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all',
    outline: 'border border-border bg-white text-foreground hover:bg-muted hover:border-primary/30 active:scale-[0.98] transition-all',
    ghost: 'bg-transparent text-foreground hover:bg-muted active:scale-[0.98] transition-all',
    destructive: 'bg-destructive text-white hover:bg-red-700 shadow-sm active:scale-[0.98] transition-all',
  }
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' }
  return (
    <button className={cn('inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}