# AVA — AI Voice Assistant 🎙️✨

[![Angular](https://img.shields.io/badge/Angular-18-dd0031?style=for-the-badge&logo=angular)](https://angular.io/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Groq LPU](https://img.shields.io/badge/Groq-LPU_Inference-f56565?style=for-the-badge)](https://groq.com/)

AVA is a state-of-the-art AI Voice Assistant web application designed for seamless, hands-free conversational experiences. Engineered with a premium tech stack, AVA delivers instant synthesized speech responses through Groq LPUs and modern Web Speech APIs.

---

## 🎨 UI/UX Product Design Philosophy
As a Lead UI/UX Product Designer, this application was sculpted around the **"Invisible Interface"** paradigm:
*   **Aesthetic:** Premium Relume/Framer-inspired Light Mode featuring curated Indigo-Violet gradient accents (`#4f46e5` to `#6d28d9`), glassmorphism overlays (`backdrop-filter: blur()`), and subtle micro-animations.
*   **Bento Grid Architecture:** The landing page utilizes asymmetric Bento Grid cards to cleanly separate copy from interactive visualizers (like the morphing CSS voice sphere).
*   **Fully Responsive:** 
    *   **Desktop:** Asymmetric grids and side-by-side workspace split-panes.
    *   **Mobile:** Off-canvas drawer menus (sidebar overlays), stacked grid collapsing, and dynamic viewport scaling to ensure an impeccable native-app feel on all devices.

---

## 🛠️ Tech Stack & Setup

### Frontend (Client)
*   **Framework:** Angular 18 (Standalone Components)
*   **Styling:** SCSS + CSS Variables + Glassmorphism
*   **Routing:** Angular Router with `withInMemoryScrolling` (Restores scroll positions automatically).

### Backend (Server)
*   **Runtime:** Node.js + Express
*   **Database & Auth:** Supabase (PostgreSQL + Row Level Security + Magic Links)
*   **AI Engine:** Groq Cloud LPUs for ultra-fast TTFT (Time-To-First-Token) inference.

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Narayanam147/AI-Voice-Assistant-Web-App.git
   cd AI-Voice-Assistant-Web-App
   ```

2. **Install Client Dependencies:**
   ```bash
   cd client
   npm install
   ```

3. **Install Server Dependencies:**
   ```bash
   cd ../server
   npm install
   ```

4. **Run the Development Servers:**
   *   *Client:* `npm start` (Runs on http://localhost:4200)
   *   *Server:* `npm run dev` (Runs on http://localhost:3000)

---
*Architected and optimized by your Senior Web Developer & AI Solutions team.*
