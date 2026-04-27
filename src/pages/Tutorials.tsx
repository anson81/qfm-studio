export default function Tutorials() {
  const tutorials = [
    { title: 'How to Generate Your First Video', level: 'Beginner' },
    { title: 'Prompt Engineering for Modest Fashion', level: 'Intermediate' },
    { title: 'UGC Content That Converts on TikTok', level: 'Advanced' },
    { title: 'Setting Up Auto-Post for Ramadan', level: 'Intermediate' },
    { title: 'Film Maker: From Story to 5-Scene Series', level: 'Advanced' },
  ]
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tutorials</h1>
      <p className="text-muted-foreground">Learn to use QFM Studio like a pro.</p>
      <div className="space-y-3">
        {tutorials.map((t, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div><p className="font-medium">{i+1}. {t.title}</p></div>
            <span className="text-xs bg-muted px-2 py-1 rounded">{t.level}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
