export default function Magic5() {
  const features = [
    'Caption Rewriter (@mention, hashtag, emoji auto-insert)',
    'Hook Generator (5 viral hook variations)',
    'Hashtag Pack (trending + branded mix)',
    'Auto-schedule to TikTok Shop & IG',
    'Thumbnail auto-select from best frame',
  ]
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Magic 5</h1>
      <p className="text-muted-foreground">5 AI-powered tools in one click: captions, hooks, hashtags, schedule, and thumbnail.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f, i) => (
          <div key={i} className="p-4 rounded-lg border bg-card">
            <span className="inline-block w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold mb-2">{i+1}</span>
            <p className="text-sm">{f}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
