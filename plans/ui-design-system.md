# NoxEscrow — UI/UX Design System & Screen Blueprint
**The Master Design and Layout Specification for Google Stitch AI Code Generation**

To deliver an institutional-grade, privacy-first interface, NoxEscrow synthesizes design paradigms and layout systems from the world's most acclaimed developer, FinTech, and SaaS applications. This document outlines the absolute design guidelines, color tokens, global hotkeys, screen maps, and component mockups.

---

## 🔗 Quality UI/UX WebApp Inspiration Registry

We provide Google Stitch with direct, contextual reference to the specific webapps guiding our design execution:

1.  **Linear (`https://linear.app`):** Calm dark minimalism, clean `1px` high-contrast solid borders (`#1E293B`), strict whitespace, keyboard-first navigation shortcuts, and command-menu overlays.
2.  **Resend (`https://resend.com`):** Pristine typography-focused design, absolute visual contrast, clean text fields, and simple, elegant card interfaces.
3.  **Stripe (`https://stripe.com`):** Elite FinTech-grade data grids, live horizontal status pipelines, and progressive form card wizard flows.
4.  **Supabase (`https://supabase.com`):** Beautifully structured database tables, clean toggles, active tab segments, and subtle gradient metrics.
5.  **Vercel (`https://vercel.com`):** Developer-first details, high-contrast indicators, monospace text alignments, and clean checkout states.
6.  **Railway (`https://railway.app`):** Real-time monitoring grids, live console telemetry terminals, and interactive visual node mappings.
7.  **Clerk (`https://clerk.com`):** Slick modal authentication cards, beautiful tab-switching transitions, and premium secure form fields.
8.  **Framer (`https://framer.com`):** Fluid, high-fidelity dark-matte layout components with glowing cyan/purple blur drop-shadows and seamless CSS transition timings.
9.  **Plane (`https://plane.so`):** Structural milestone boards, task status listings, and intuitive issue trackers.
10. **Dub.co (`https://dub.co`):** Interactive dashboard layouts, gorgeous custom toggle sliders, and crisp, lightweight analytics cards.

---

## 🎨 Global Design Tokens & Typography

We enforce a strict, low-luminance palette designed to project cryptographic security and elite developer comfort.

### Color Palette (Space Minimal)

| Token Name | Hex Code | Visual Application (Tailwind Class equivalent) | Inspiration |
| :--- | :--- | :--- | :--- |
| **Space Black** | `#0B0F19` | Main application viewport canvas (`bg-[#0B0F19]`) | Resend / Linear |
| **Carbon Gray** | `#161F30` | Cards, Sidebar, Terminal Containers (`bg-[#161F30]`) | Supabase / Clerk |
| **Border Slate** | `#1E293B` | Structural `1px` grids and dividers (`border-[#1E293B]`) | Linear / Stripe |
| **Nox Teal** | `#00F2FE` | Primary Actions, Active Timelines, Decrypted values (`text-[#00F2FE]`, `bg-[#00F2FE]`) | Framer / Dub |
| **Hyper Purple**| `#7F00FF` | Encrypted handles, WebCrypto status, glowing shadows (`shadow-[#7F00FF]`) | Vercel / Framer |
| **Secure Green**| `#00E676` | Successful releases, completed milestones (`text-[#00E676]`) | Supabase / Stripe |
| **Warning Red** | `#FF1744` | Raised disputes, cancellation triggers, reputation loss (`text-[#FF1744]`) | Plane / Linear |

### Typography System

*   **Primary Typeface:** `Inter` (Sans-serif) for high-density tabular metadata, dashboard details, and descriptive guidelines (`font-sans`).
*   **Secondary Typeface:** `JetBrains Mono` (Monospace) for wallet addresses, smart contract handles, budget values, and live TEE telemetry logs (`font-mono`).
*   **Mobile Adaptability:** Maximum of 16px baseline on screens <= 1024px to prevent typography overflow while maintaining a strict 48px touch target zone.

---

## ⌨️ Global Keyboard-First Navigation Specification

NoxEscrow is completely navigable via keyboard shortcuts, matching the fast developer workflow of *Linear*. Pressing `H` at any time slides down a clean HUD showing this directory:

```
┌────────────────────────────────────────────────────────┐
│  ⌨️  NoxEscrow Global Hotkey Map                        │
│                                                        │
│  [C]  Connect Wallet & Derive Private Vault Key       │
│  [T]  Toggle Mode: Hiring (Client) ⇋ Working (Worker)  │
│  [N]  Create New Escrow Agreement (Wizard)             │
│  [D]  Return to Dashboard / Command Center             │
│  [M]  Cycle active milestones (Previous / Next)        │
│  [H]  Toggle Keyboard Shortcut HUD Help Overlay        │
│  [Esc] Close active overlay, modal, or wizard step     │
└────────────────────────────────────────────────────────┘
```

*   **System Detail:** Hotkey events are captured globally using a React `useEffect` listener that ignores triggers when standard input or textarea fields have active focus.

---

## 🗺️ Screen-by-Screen Layout & Functional Blueprint

### Screen 1: The Cryptographic Portal (Welcome & Key Derivation Gateway)
*   **Inspiration:** *Clerk* (Modal container) + *Framer* (Fluid drop-shadow blurs).
*   **Layout:** Single centered, high-contrast panel (`max-w-md`) floating on a pitch-black canvas with a pulsing purple glow.
*   **Aesthetics:** 
    *   Main Card: `#161F30` with `1px` solid `#1E293B` border.
    *   Underneath, the main dashboard's grids are visible but fully locked behind a heavy blur (`backdrop-blur-xl bg-black/60`).
*   **Interactions & Flows:**
    1.  **State A (Wallet Unconnected):** Prominent, glowing `[Connect Wallet (Press C)]` button in Nox Teal.
    2.  **State B (Wallet Connected / Key Missing):** Button transitions to `[Derive Private Vault Key]`. A monospace alert shows: `Status: [🔴 LOCAL ENVIRONMENT LOCKED]`.
    3.  **State C (Signature Generated):** WebCrypto PBKDF2 executes in-memory. A glowing teal wave animation propagates across the card. The blur drops to `0px` with a `700ms` transition, revealing the unlocked dashboard. Monospace alert shifts to: `Status: [🟢 LOCAL ENVIRONMENT DECRYPTED / ACTIVE]`.

---

### Screen 2: The Command Center (Main Portfolio Dashboard)
*   **Inspiration:** *Dub.co* (Clean analytics widgets) + *Supabase* (Tabbed status columns).
*   **Layout:** Three-pane dashboard split:
    1.  **Top Navigation Ribbon:** Displays connected wallet address `0x8f...e10`, vault status `[🔒 VAULT DECRYPTED]`, cUSDC balance, and a gorgeous Dub-style sliding toggle selector reading `[ Hiring as Client ]` and `[ Working as Freelancer ]` (Press `T` to slide-toggle).
    2.  **Portfolio Listing Feed (Left 2/3):** Table displaying active agreements. Toggling mode slides the list and instantly refilters content:
        *   *Columns:* Agreement ID (Monospace), Counterparty, Milestone Progress (e.g. `2/4`), Total Budget (glowing Purple), and Status Badges.
    3.  **NERM Reputation Gauge (Right 1/3):** A sleek card showing the freelancer's current reputation XP score as a circular gauge with glowing teal milestones, detailing current streak levels and professional tiers (Bronze, Silver, Gold).
*   **Cryptographic Shimmer Behavior:**
    *   If the vault key is locked, budget columns show a pulsing purple bar: `██████ cUSDC`. Hovering shows an info-card: *"Derive key to decrypt locally."*
    *   Once decrypted, the bar dissolves, fading in plain-text cUSDC budgets outlined in a sharp, glowing violet border.

---

### Screen 3: The Drafting Wizard (Multi-Step Escrow Builder)
*   **Inspiration:** *Stripe* (Form flow card) + *Resend* (Prisinte text layouts).
*   **Layout:** Horizontal progress indicator on top with a split-screen container below.
    *   *Left Form Pane:* Sleek monospace text fields. Inputs use focus states that highlight with a solid `1px` glowing purple border and `0 0 10px #7F00FF` drop-shadow.
    *   *Right Code Preview Pane:* Renders a live, compiled JSON preview representing the smart contract fields.
*   **Step Progress Pipeline:**
    *   `01. Counterparties` ➔ `02. Milestone Allocations` ➔ `03. Review & Deploy`
*   **Functional Mechanics:**
    *   *Step 1:* Input Freelancer Address, TEE Arbiter Address (pre-filled with canonical default), and number of sequential milestones (1-20).
    *   *Step 2:* Adds milestone configuration blocks dynamically. Enter "Milestone Budget (cUSDC)" and "Task Requirements".
*   **The Cryptographic Compile Effect:**
    *   Clicking `Compile & Deploy (Press Enter)` triggers an in-browser compilation animation: the plaintext requirements are visually scrambled into hex strings, signaling to the developer that client-side WebCrypto encryption is packing files into `{ ciphertext, iv }` objects before deploying.

---

### Screen 4: The Milestones Workspace (The Active Agreement View)
*   **Inspiration:** *Plane.so* (Visual board task management) + *Stripe* (Progressive pipelines).
*   **Layout:** Structural status tracker at the top, split workspace below.
    1.  **Active Milestone Pipeline Tracker:**
        *   `Scaffold UI (Approved) ✅` ──► `API Mock (In Review) 📬` ──► `TEE Integration (Active) 🔒` ──► `Production (Pending)`.
    2.  **Split Workspace Board:**
        *   *Left Board Pane (Milestone Specifications):* Displays the decrypted task requirements with a sharp purple glowing drop-shadow. Includes criteria highlight badges (e.g. `Performance`, `Test Coverage`).
        *   *Right Board Pane (Deliverables Console):*
            *   *Freelancer perspective:* An active drag-and-drop secure file dropzone labeled `[Drop encrypted code archive (ZIP) or paste Git PR diff]`. Triggers native WebCrypto AES-GCM on-the-fly.
            *   *Client perspective:* Renders submitted git diff details, PR checksums, and a countdown timer for the automatic release window expiration (`reviewWindow`).
*   **Core CTAs:**
    *   `[Approve & Release (A)]` (Triggers rating select modal: 1 to 5 stars), `[Raise Dispute (D)]` (Warning Red), `[Mutual Cancel (C)]` (Carbon outline).

---

### Screen 5: The TEE Dispute Terminal (The Secure Courtroom Console)
*   **Inspiration:** *Railway* (Live server logs) + *Chronosphere* (Telemetry details).
*   **Layout:** A fullscreen, high-contrast monospace console grid representing the secure TEE execution.
*   **Left Telemetry Grid (Hardware Status):**
    *   Displays real-time hardware gauges:
        *   `[CPU] Intel TDX hardware Enclave: ACTIVE (98% Isolation)`
        *   `[NET] Webhook Listener: DISPUTE_OPENED trigger received`
        *   `[KMS] Nox KMS: Decryption Keys retrieved securely`
*   **Right Telemetry Grid (AI Reasoning Terminal):**
    *   Renders a live green-on-black scrolling log representing Gemini 2.5 Flash's dispute assessment script:
        ```
        [09:42:01] 📡 disputeOpened event captured for Escrow: 0x8f...e10
        [09:42:03] 🔓 Authorizing transient read permissions...
        [09:42:05] ✔️ Decrypted requirements: "Build a responsive dark-themed sidebar with collapsible menus."
        [09:42:08] ✔️ Decrypted deliverables: "Collapsible menu responsive React+Tailwind code payload."
        [09:42:12] 🤖 Initializing Google Gemini 2.5 Flash Arbiter inside TDX...
        [09:42:15] ⚖️ Evaluation in progress: Checking responsive behavior, testing browser animations.
        [09:42:18] ⚖️ Score: 95/100 (Passes the 90% threshold requirement).
        [09:42:20] ⚖️ Verdict: PAY_FREELANCER.
        [09:42:22] 🚀 Broadcasting resolveDispute(true) to ETH Sepolia...
        ```
*   **Settlement Overlay:**
    *   A massive, blinking central banner fades in: `[⚖️ VERDICT RENDERED: PAY_FREELANCER (Dispute Settled)]` or `[⚖️ VERDICT RENDERED: REFUND_CLIENT]`.

---

### Screen 6: The Cryptographic Receipt (Proof-of-Receipt)
*   **Inspiration:** *Vercel Ship* (Beautiful shared screens) + *FinTech Receipt Card*.
*   **Layout:** A central shareable modal card displaying a premium, styled digital receipt with a fine metallic border.
*   **Core Elements:**
    *   Card title: `🛡️ NoxEscrow Certified Payout`.
    *   Displays public addresses of Client & Freelancer, Completed Milestone count (e.g. `4/4`), and Verifiable TEE signature.
    *   **Pulsing Cryptographic Redaction:**
        *   The budget line is rendered as `[ ████████ ] cUSDC` with a pulsing purple border.
        *   *Interactive Hover:* Hovering the cursor over the redacted budget reveals a floating tool-tip: *"This transaction value is sealed in zero-knowledge. Confidentiality is guaranteed by the iExec Nox Protocol."*
*   **Viral CTAs:**
    *   `[Share to Twitter / X]`, `[Share to LinkedIn]`, `[Export PDF / PNG]`.

---

*This blueprint is stored securely in `plans/ui-design-system.md` and provides Google Stitch with the exact context and live links to design our premium, privacy-first frontend dApp.*
