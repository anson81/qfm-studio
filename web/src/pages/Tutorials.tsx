import {
  Video, Sparkles, Hash, Calendar, Film,
  GraduationCap, Clock, BookOpen
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'

const tutorials = [
  {
    icon: Video,
    title: 'How to Generate Your First Video',
    description: 'Step-by-step walkthrough of creating your first AI-generated video — from prompt to publish.',
    level: 'Beginner',
    duration: '10 min',
  },
  {
    icon: Sparkles,
    title: 'Prompt Engineering for Modest Fashion',
    description: 'Master the art of writing prompts that produce stunning, culturally-aware fashion content.',
    level: 'Intermediate',
    duration: '15 min',
  },
  {
    icon: Hash,
    title: 'UGC Content That Converts on TikTok',
    description: 'Learn proven patterns for creating user-generated content that drives engagement and sales.',
    level: 'Advanced',
    duration: '20 min',
  },
  {
    icon: Calendar,
    title: 'Setting Up Auto-Post for Ramadan',
    description: 'Schedule and automate your content calendar around peak Ramadan shopping moments.',
    level: 'Intermediate',
    duration: '12 min',
  },
  {
    icon: Film,
    title: 'Film Maker: From Story to 5-Scene Series',
    description: 'Turn a single idea into a cohesive 5-scene video series with consistent characters and style.',
    level: 'Advanced',
    duration: '25 min',
  },
]

const levelColor: Record<string, string> = {
  Beginner: 'bg-emerald-100 text-emerald-700',
  Intermediate: 'bg-amber-100 text-amber-700',
  Advanced: 'bg-purple-100 text-purple-700',
}

const levelAccent: Record<string, string> = {
  Beginner: 'border-emerald-400',
  Intermediate: 'border-amber-400',
  Advanced: 'border-purple-400',
}

export default function Tutorials() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Tutorials</h1>
          <p className="text-muted-foreground">Learn to use QFM Studio like a pro.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tutorials.map((t, i) => (
          <Card key={i} className={`border-l-4 ${levelAccent[t.level]} group cursor-pointer`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <t.icon className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base leading-snug">{t.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
              <div className="flex items-center justify-between pt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelColor[t.level]}`}>
                  {t.level}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {t.duration}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
        <BookOpen className="w-4 h-4" />
        <span>More tutorials coming soon — stay tuned!</span>
      </div>
    </div>
  )
}