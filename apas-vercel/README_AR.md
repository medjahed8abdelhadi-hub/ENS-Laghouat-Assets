# APAS - AI Projectile Analysis System
## نظام تحليل المقذوفات بالذكاء الاصطناعي

تطبيق متقدم لمحاكاة وتحليل حركة المقذوفات بالذكاء الاصطناعي Claude متوافق تماماً مع Vercel.

## ✨ الميزات الرئيسية

- 🎯 محاكاة فيزيائية متقدمة (RK4 و Euler)
- 🤖 تحليل ذكي بـ Claude Vision و Chat AI
- 📊 رسوم بيانية تفاعلية
- 🌐 عرض ثلاثي الأبعاد (3D)
- 🌍 دعم 3 لغات (العربية, الإنجليزية, الفرنسية)
- 🔒 API Key محمي بـ Vercel Serverless Functions

---

## 🚀 خطوات النشر على Vercel

### 1️⃣ تحضير GitHub

```bash
cd apas-vercel
git init
git add .
git commit -m "Initial commit: APAS app for Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/apas-vercel.git
git push -u origin main
```

### 2️⃣ ربط مع Vercel

1. اذهب إلى https://vercel.com
2. اضغط **+ New Project**
3. اختر **Import Git Repository**
4. ألصق رابط الـ repo
5. اضغط **Import**

### 3️⃣ إضافة متغيرات البيئة

في لوحة Vercel:
1. اذهب إلى **Settings** → **Environment Variables**
2. أضف:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-api03-...` (API Key الخاص بك)

### 4️⃣ النشر التلقائي

التطبيق سينشر تلقائياً عند كل push على `main`

---

## 🔒 الأمان - تنبيه مهم!

**⚠️ API Key الذي أعطيته علني - يجب تغييره فوراً!**

#### الخطوات:
1. اذهب إلى https://console.anthropic.com
2. احذف API Key القديم
3. أنشئ API Key جديد
4. حدّث Vercel Environment Variables
5. أعد نشر التطبيق

#### التدفق الآمن:
```
Browser (Frontend)
    ↓
/api/chat (Vercel Function)
    ↓ (API Key محفوظ بأمان على الخادم)
Anthropic API
    ↓
الاستجابة (بدون API Key)
Browser
```

---

## 📁 هيكل المشروع

```
apas-vercel/
├── src/                 ← React Components
│   ├── App.jsx
│   └── main.jsx
├── api/
│   └── chat.js         ← Serverless Function (محمي)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json         ← إعدادات Vercel
├── .env.local         ← متغيرات محلية (لا تُرفع!
└── README.md
```

---

## 🖥️ التشغيل المحلي

```bash
# التثبيت
npm install

# التطوير
npm run dev

# البناء
npm run build

# المعاينة
npm run preview
```

---

## ✅ Checklist قبل النشر

- [ ] تغيير API Key القديم
- [ ] إضافة API Key الجديد في Vercel
- [ ] رفع الكود على GitHub
- [ ] ربط Vercel مع Git
- [ ] اختبار التطبيق على URL الحي

---

## 📞 الدعم

للمساعدة:
- 📧 تواصل مع المطورين
- 🐛 أبلغ عن الأخطاء على GitHub Issues
- 💡 اقترح ميزات جديدة

---

**الآن تطبيقك جاهز للعالم! 🚀✨**
