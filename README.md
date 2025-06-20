# AI Assistant Menu – Customer Web App

This is the customer-facing web application for the "AI Assistant Menu by Zimmermann Makes" platform. It provides a fully interactive, real-time, AI-powered menu and ordering experience for restaurant guests.

## Folder Structure

```
customer-web/
  index.html                # Main menu, language selection, cart, AI assistant
  email-verification.html   # Supabase email confirmation page
  reset-password.html       # Password reset page
  order-status.html         # Real-time order progress
  feedback.html             # Feedback form after order completion
  error.html                # Generic error/404 page
  assets/                   # Images, icons, branding
  styles.css                # Unified, mobile-first, accessible styles
  app.js                    # Main app logic (menu, cart, AI, etc.)
  auth.js                   # Auth/session/verification logic
  ai.js                     # AI translation & recommendations
  supabase.js               # Supabase client, real-time, API helpers
  utils.js                  # Shared utilities
  README.md                 # This file
```

## Pages & Workflows

- **index.html**: Main menu, language selection, cart, AI assistant, add to order, group order logic
- **email-verification.html**: Handles Supabase email confirmation links
- **reset-password.html**: Password reset flow for customers
- **order-status.html**: Real-time order progress and updates
- **feedback.html**: Feedback form after order completion
- **error.html**: Generic error/404 page

## Features

- QR code parsing and session logic (table, reservation, geocode, time-token)
- Language selection and real-time AI translation (OpenAI/Deepseek/Google Translate API)
- AI Waiter/Assistant (contextual, multi-language, real-time recommendations)
- Menu display (cards, categories, allergens, dietary, images)
- Add to cart, cart view, and real-time group cart logic
- Collective order placement (consensus, real-time, confirmation)
- Order progress (real-time updates from kitchen)
- Session persistence (localStorage/sessionStorage, restore on re-scan)
- Feedback collection (star rating, text, auto-redirect)
- Workflow reset after feedback
- Accessibility, mobile-first, and professional polish
- Error handling, loading states, and user feedback
- API integration for menu data (from GitHub/Netlify), Supabase Realtime, and AI

## Setup

1. **Clone this repo or copy the `customer-web/` folder.**
2. **Configure environment variables:**
   - `SUPABASE_URL` – Your Supabase project URL
   - `SUPABASE_ANON_KEY` – Your Supabase public anon key
   - `OPENAI_API_KEY` or `DEEPSEEK_API_KEY` – For AI translation and recommendations
   - (Optional) `GOOGLE_TRANSLATE_API_KEY` – For translation fallback
3. **Update `supabase.js` and `ai.js` to load these from a `.env` file or Netlify environment settings.**
4. **Deploy to Netlify:**
   - Connect your GitHub repo
   - Set environment variables in Netlify dashboard
   - Deploy!

## Deployment

- **Netlify:** Recommended for static hosting and instant CI/CD from GitHub
- **Custom Domain:** Configure in Netlify settings
- **SSL/TLS:** Enabled by default on Netlify

## Notes

- All API keys are loaded securely from environment/config, never hardcoded.
- The app is fully mobile-first, accessible, and production-ready.
- For branding, update `assets/` with your logo and colors.

---

For any questions or support, contact Zimmermann Makes. 