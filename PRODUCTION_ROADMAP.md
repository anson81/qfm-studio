# QFM Studio — Production Roadmap Reference

> Prototype works. Here's what's needed to make it SaaS-grade.
> Status: **Reference only** — use for QFM's own content generation for now.

## What Works (Above Water)
- ✅ Storyboard → Video pipeline (KIE.AI integration)
- ✅ Multi-model support (Veo3, Kling, Runway, Flux)
- ✅ Multi-part video auto-segmentation with story-to-video-prompt conversion
- ✅ User auth (JWT), dashboard, content library
- ✅ Per-segment backend save with thumbnail_url + video_url
- ✅ Resume polling on page refresh
- ✅ Stop-on-first-failure (saves credits)
- ✅ Prompt auto-condensing for long storyboards (800+ chars)

## What's Missing for SaaS (Under Water)

### Critical (must-have to sell)
1. **Stripe billing** — subscription tiers, credit purchasing, usage metering
2. **Webhook callbacks** — KIE calls US when done, no more 6-min polling
3. **Permanent media storage** — download KIE videos to S3/R2 (expires in 20min otherwise)
4. **Multi-tenant data isolation** — proper row-level security, not just user_id FK
5. **Payment-gated access** — free tier with limits, paid tiers

### Important (competitive SaaS)
6. **PostgreSQL** — replace SQLite for concurrent users
7. **Rate limiting** — per-user API throttling
8. **Error recovery UX** — retry failed generations, not just "Recheck"
9. **Email verification + password reset** — real auth system
10. **Monitoring & alerting** — Sentry, uptime checks, error tracking

### Nice-to-have (polish)
11. **AI-powered storyboard-to-video-prompt** — proper NLP extraction, not regex
12. **Video combining** — server-side concatenation of multi-part videos
13. **Content scheduling** — queue generations, batch processing
14. **Team/workspace support** — multi-user collaboration
15. **Analytics dashboard** — generation stats, cost tracking, ROI

## Architecture Notes
- Frontend: React + Vite SPA on GitHub Pages
- Backend: FastAPI + SQLAlchemy + SQLite on localhost:8000
- API: KIE.AI (direct browser calls, not proxied)
- Auth: JWT tokens, KIE key stored per-user (encrypted)
- DB: Content model now has `thumbnail_url` + `result_url` separation
- Deploy: `python deploy.py` → gh-pages push

## Key Lessons Learned (2025-05)
- KIE tempfile URLs expire in ~20min → must download/store permanently
- KIE video models reject prompts >800 chars → auto-condense storyboards
- Backend stored `.png` thumbnails as `result_url` → now saves real `.mp4` URLs separately
- `resumeSegmentPoll` must save to backend on completion, not just localStorage
- Multi-part generation: stop after first failure to save credits