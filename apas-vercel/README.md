# APAS — AI Projectile Analysis System
## Vercel Deployment Guide

### الخطوات السريعة (Quick Deploy)

**1. ارفع المجلد على GitHub:**
- أنشئ repo جديد على github.com
- ارفع كل الملفات (drag & drop في المتصفح)

**2. ربط Vercel بـ GitHub:**
- اذهب إلى vercel.com → New Project
- اختر الـ repo الذي أنشأته
- اضغط Deploy

**3. أضف الـ API Key (الأهم!):**
- في Vercel Dashboard → Project → Settings → Environment Variables
- أضف متغير جديد:
  - Name: `ANTHROPIC_API_KEY`
  - Value: `sk-ant-api03-...` (الـ key الجديد)
  - Environment: Production + Preview + Development
- اضغط Redeploy

**4. رابطك الخاص جاهز! 🎉**
```
https://your-project-name.vercel.app
```

---

### البنية التقنية

```
apas-vercel/
├── pages/
│   ├── api/
│   │   └── anthropic.ts   ← Proxy آمن (API Key لا يُكشف للمتصفح)
│   ├── _app.tsx
│   └── index.tsx          ← التطبيق الرئيسي
├── styles/
│   └── globals.css
├── .env.example
├── next.config.js
├── package.json
└── tsconfig.json
```

### الأمان 🔒
- الـ API Key محفوظ في متغيرات Vercel (server-side فقط)
- المتصفح يتصل بـ `/api/anthropic` (proxy داخلي)
- لا يمكن لأحد رؤية الـ Key في كود المتصفح

---
Built with Next.js + TypeScript + Three.js + Recharts
