<div dir="rtl">

# LLMUI Core v1.0.0

> **اللغة / Language:** [🇫🇷 Français](README.md) | [🇬🇧 English](README.en.md) | [🇪🇸 Español](README.es.md) | [🇩🇪 Deutsch](README.de.md) | [🇵🇹 Português](README.pt.md) | 🇸🇦 العربية

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688.svg)](https://fastapi.tiangolo.com)
[![Ollama](https://img.shields.io/badge/Ollama-local-black.svg)](https://ollama.com)
[![PostgreSQL 16+](https://img.shields.io/badge/PostgreSQL-16%2B-336791.svg)](https://postgresql.org)
[![Platform](https://img.shields.io/badge/Platform-Debian%2013%20%7C%20Ubuntu%2024.04-lightgrey.svg)](https://debian.org)

> **واجهة ويب لإجماع النماذج الذكية متعددة النماذج — السيادة الرقمية على البنية التحتية الخاصة**

تطوير **François Chalut** — Technologies Nexios TF Inc.  
لا اعتماد على السحابة. يعمل بالكامل على البنية التحتية الخاصة عبر Ollama المحلي.

---

## نظرة عامة

يقدم LLMUI Core وضعَين للتفاعل مع نماذج اللغة الكبيرة المحلية:

- **الوضع البسيط**: طلب مباشر إلى نموذج Ollama واحد
- **وضع الإجماع**: تحليل عدة نماذج عاملة بالتوازي، يقوم نموذج الدمج بالتوليف

### الهندسة المعمارية

```
┌─────────────┐
│   Nginx     │  ← بروكسي عكسي HTTPS (المنفذ 80/443)
└──────┬──────┘
       │
┌──────▼──────────┐
│  llmui-core     │  ← واجهة برمجة FastAPI (المنفذ 8004)
│   (FastAPI)     │
└──────┬──────────┘
       │
┌──────▼──────┐
│   Ollama    │  ← نماذج LLM المحلية (المنفذ 11434)
└─────────────┘
```

---

## المتطلبات الأساسية

| المكوّن | الإصدار |
|---------|---------|
| Python | 3.11+ |
| PostgreSQL | 16+ |
| Ollama | 0.1+ |
| Nginx | 1.18+ |
| نظام التشغيل | Debian 13 / Ubuntu 24.04 / Zorin OS 18 |

**الأجهزة الموصى بها:** 4 أنوية معالج، 16 جيجابايت RAM، 50 جيجابايت قرص ثابت

---

## التثبيت

### 1. استنساخ المستودع

```bash
git clone https://github.com/GenAICos/llmui-core.git
cd llmui-core
```

### 2. تثبيت تبعيات Python

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. تهيئة البيئة

```bash
cp .env.example .env
# تحرير .env بقيمك الخاصة:
#   DATABASE_URL=postgresql+asyncpg://llmui_user:كلمة_المرور@localhost:5432/llmui_core
#   APP_PORT=8004
#   APP_ENV=production
```

### 4. إنشاء قاعدة بيانات PostgreSQL

```bash
# توليد كلمة مرور آمنة
openssl rand -hex 32

# تحرير postInstallScripts/create_database.sql لاستبدال DB_PASSWORD
psql -U postgres -f postInstallScripts/create_database.sql
```

راجع [`postInstallScripts/README.md`](postInstallScripts/README.md) للتفاصيل.

### 5. إنشاء حساب المدير

```bash
python3 scripts/create_admin.py
```

يطلب السكريبت بريدًا إلكترونيًا وكلمة مرور (12 حرفًا على الأقل، مشفرة بـ Argon2) ثم يسجل حساب المدير في PostgreSQL. يُطلب إعداد TOTP (إلزامي للمديرين) عند أول تسجيل دخول.

### 6. تهيئة Nginx

```bash
# نسخ وتكييف vhost (استبدال DOMAIN وAPP_PORT)
cp postInstallScripts/nginx_vhost.conf /etc/nginx/sites-available/llmui-core
ln -s /etc/nginx/sites-available/llmui-core /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7. تشغيل الخلفية

```bash
python3 src/llmui_backend.py
```

أو عبر systemd. للتثبيت الآلي الكامل (المتطلبات الأساسية، PostgreSQL، **إنشاء حساب المدير**، خدمات systemd، جدار الحماية)، استخدم المثبّت التفاعلي — يطلب البريد الإلكتروني وكلمة مرور المدير ويسجلهما في PostgreSQL:

```bash
sudo ./scripts/install_interactive.sh
```

---

## ودجت Andy — الدعم بالذكاء الاصطناعي

**Andy** هو مساعد الدعم المدمج، يمكن الوصول إليه من جميع الصفحات عبر زر عائم (أسفل اليمين).

- **الصورة الرمزية**: `images/andyLogo.png`
- **النموذج**: Ollama `qwen3.5:0.8b` (قابل للتهيئة عبر `/zadmin`)
- **نقطة النهاية**: `POST /api/support/chat`
- **خيار** "التحدث مع إنسان" دائمًا مرئي

يرد Andy بلغة المستخدم ولا يرسل أبدًا بيانات حساسة.

---

## هيكل المشروع

```
llmui-core/
├── web/                        ← الواجهة الأمامية Vanilla JS + CSS مخصص
│   ├── index.html              ← الصفحة الرئيسية
│   ├── login.html              ← صفحة تسجيل الدخول
│   ├── app.js                  ← المنطق الرئيسي (LLMUIApp)
│   ├── andy.js                 ← ودجت دعم Andy
│   ├── andy.css                ← أنماط ودجت Andy
│   ├── i18n.js                 ← التدويل (6 لغات)
│   └── ...
├── src/                        ← الخلفية FastAPI
│   ├── llmui_backend.py        ← الواجهة البرمجية الرئيسية
│   └── llmui_proxy.py          ← البروكسي + الجلسات
├── images/
│   ├── Icon-Only-White.png     ← شعار الترويسة
│   └── andyLogo.png            ← صورة Andy الرمزية
├── postInstallScripts/         ← سكريبتات ما بعد التثبيت
│   ├── nginx_vhost.conf        ← Vhost Nginx HTTPS
│   ├── create_database.sql     ← إنشاء قاعدة بيانات PostgreSQL (ذاتي الكفاءة)
│   └── README.md               ← التعليمات
├── scripts/                    ← سكريبتات تثبيت النظام
├── tests/                      ← اختبارات pytest
├── docs/                       ← التوثيق التقني
├── CLAUDE.md                   ← سياق المشروع لـ Claude Code
├── STANDARDS.md                ← معايير Nexios TF (السلطة المطلقة)
├── CHANGELOG.md                ← سجل الإصدارات
├── .env.example                ← قالب متغيرات البيئة
└── requirements.txt            ← تبعيات Python
```

---

## نقاط نهاية الواجهة البرمجية

| الطريقة | المسار | المصادقة | الوصف |
|---------|--------|----------|-------|
| POST | `/api/auth/login` | لا | تسجيل الدخول |
| GET | `/api/auth/verify` | نعم | التحقق من الرمز |
| POST | `/api/auth/logout` | نعم | تسجيل الخروج |
| GET | `/api/models` | نعم | قائمة نماذج Ollama |
| POST | `/api/simple-generate` | نعم | التوليد بالوضع البسيط |
| POST | `/api/consensus-generate` | نعم | التوليد بوضع الإجماع |
| GET | `/api/stats` | لا | إحصائيات النظام |
| POST | `/api/support/chat` | نعم | دردشة دعم Andy |
| GET | `/health` | لا | فحص الصحة |

التوثيق الكامل: [`docs/API.md`](docs/API.md)

---

## الميزات

### إجماع متعدد النماذج
1. تحلل **النماذج العاملة** الطلب بالتوازي (من 2 إلى 5 نماذج)
2. يلخص **نموذج الدمج** الردود في إجابة موحدة
3. مهلات قابلة للتهيئة: 15 دقيقة → 12 ساعة (4 مستويات)

### الملفات المدعومة
`.txt` `.md` `.py` `.js` `.json` `.csv` `.sh` `.css` `.html` `.xml` `.yaml` `.docx` `.xlsx` `.pdf`

### التدويل
6 لغات: `fr` `en` `es` `de` `pt` `ar` (من اليمين إلى اليسار)

### الأمان
- Argon2 لكلمات المرور (لا bcrypt/SHA-256 أبدًا)
- JWT + جلسات آمنة
- TOTP إلزامي للمديرين
- رؤوس أمان Nginx (HSTS، CSP، X-Frame-Options…)
- سمة فاتحة/داكنة

---

## إدارة الخدمات

```bash
# الحالة
sudo systemctl status llmui-core nginx

# السجلات المباشرة
sudo journalctl -u llmui-core -f

# إعادة التشغيل
sudo systemctl restart llmui-core
```

## التطوير

```bash
# تشغيل الخلفية
python3 src/llmui_backend.py

# الاختبارات
python3 -m pytest tests/ -v --tb=short

# الفحص اللغوي
ruff check src/

# التحقق من Ollama
curl http://localhost:11434/api/tags
```

---

## التوثيق

| الملف | المحتوى |
|-------|---------|
| [`STANDARDS.md`](STANDARDS.md) | معايير Nexios TF (السلطة المطلقة) |
| [`CHANGELOG.md`](CHANGELOG.md) | سجل الإصدارات |
| [`postInstallScripts/README.md`](postInstallScripts/README.md) | سكريبتات ما بعد التثبيت |
| [`docs/API.md`](docs/API.md) | توثيق واجهة REST البرمجية |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | الهندسة التقنية |
| [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) | استكشاف الأخطاء وإصلاحها |

---

## الرخصة

© Technologies Nexios TF Inc. — nexiostf.com  
AGPLv3 + Commons Clause — راجع [`LICENSE`](LICENSE)

---

## الدعم

- **المشكلات**: [github.com/GenAICos/llmui-core/issues](https://github.com/GenAICos/llmui-core/issues)
- **البريد الإلكتروني**: support@nexiostf.com

---

**طُوِّر في كيبيك بواسطة François Chalut — من أجل السيادة الرقمية 🇨🇦**

</div>
