# LearnSphere E-Learning Platform (MERN)

A production-grade, multi-role e-learning platform where students browse and purchase courses, watch lectures with progress tracking, take AI quizzes, chat with an AI video tutor, and earn verifiable certificates. Teachers build curriculums with drag-and-drop structures, manage pricing, and track revenues.

---

## 1. Directory Structure

```
LearnSphere/
├── client/                  # React SPA (Vite, Tailwind, Redux)
│   ├── src/
│   │   ├── components/      # Common UI elements (Navbar, layouts)
│   │   ├── store/           # Redux state slices (authSlice)
│   │   ├── services/         # Axios wrapper (refresh token interceptor)
│   │   └── pages/           # Discovery, watcher, dashboards, verifier
│   └── tailwind.config.js
│
├── server/                  # Node.js & Express.js REST API
│   ├── src/
│   │   ├── config/          # DB connection, Cloudinary, Stripe
│   │   ├── models/          # User, Course, Progress, Payments, Forum
│   │   ├── controllers/     # Business logic handlers
│   │   ├── routes/          # Express API route bindings
│   │   ├── middlewares/     # Auth checks, error handling, rate limiting
│   │   └── services/         # PDF generator, AI chat services
│   ├── server.js            # Node listener and crash interceptors
│   └── .env.example
│
└── docs/                    # Architecture and REST API guides
```

---

## 2. Environment Configurations

Copy the `.env.example` in `/server` to `.env` and fill in:
- `PORT=5001`
- `MONGODB_URI=mongodb://localhost:27017/learnsphere`
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
- `CLOUDINARY_CLOUD_NAME` & `CLOUDINARY_API_KEY` & `CLOUDINARY_API_SECRET`
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`

*Note: The platform features comprehensive offline/mock fallback mechanisms. If Cloudinary, Stripe, or OpenAI keys are set to dummy/mock values, the platform will fall back to local file uploads, mock checkout paths, and semantic Q&A generators automatically, ensuring full functionality out-of-the-box.*

---

## 3. Installation & Run Instructions

### Step 1: Clone and Set Up Server
```bash
cd server
npm install
npm run seed     # Seeds database with admin, teacher, student, and MERN course
npm run dev      # Boots backend on http://localhost:5001
```

### Step 2: Set Up Client
```bash
cd client
npm install
npm run dev      # Boots React Vite SPA on http://localhost:5173
```

---

## 4. Platform Role Highlights

1. **Students**: Can register, search courses with multi-filters, apply discount coupons (e.g. `MERN50`), execute simulated payments, track completed lectures, ask the AI Video Tutor questions, complete chapter quizzes, upvote questions on forums, and verify completion certificates.
2. **Teachers**: Approved teachers can log in, create courses, edit curricula (reorder chapters/lectures with Up/Down buttons), upload slide decks, reply to student reviews, and view net revenue charts (after 20% platform commission).
3. **Admins**: Can audit pending course reviews, suspend/unsuspend student/teacher credentials, and view gross revenues.
