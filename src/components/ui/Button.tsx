import { cn } from './cn'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}
export function Button({ children, variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  const variants = {
    default: 'bg-primary text-white hover:bg-primary/90',
    outline: 'border border-border bg-transparent hover:bg-muted',
    ghost: 'bg-transparent hover:bg-muted',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  }
  const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' }
  return (
    <button className={cn('inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
