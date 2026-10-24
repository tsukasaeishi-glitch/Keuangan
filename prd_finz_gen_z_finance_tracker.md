# Product Requirement Document (PRD)
## FinZ - Modern Finance & Smart Consumption Tracker for Gen Z

---

## 1. Document Overview
* **Product Name:** FinZ (Tentative)
* **Target Audience:** Generation Z (Ages 18–27) – Tech-savvy, value aesthetics, appreciate speed and simplicity.
* **Platform:** Web Application (Responsive: Desktop & Mobile-first)
* **Document Version:** 1.0
* **Status:** Final Draft

---

## 2. Product Vision & Objectives
FinZ is designed to redefine how Gen Z manages their money. Unlike rigid, traditional accounting apps, FinZ blends personal financial tracking (income & expenses) with smart consumption analysis (cost-per-day & item usage lifespan). It offers a sleek, non-tacky UI, auto-timestamps, dark/light theme options, and intuitive micro-interactions to build healthy financial habits effortlessly.

---

## 3. User Personas & Aesthetic Guidelines

### User Persona
* **Name:** Alex (21 y.o., University Student / First-jobber)
* **Needs:** Wants a fast way to track monthly allowance/salary, know when daily necessities (shampoo, coffee beans, skincare) will run out, and keep track of impulse spending—all inside a stylish interface.

### UI/UX & Design Philosophy (Gen Z Aesthetic)
* **Visual Style:** Modern Minimalist with Soft Glassmorphism and Clean Borders.
* **Typography:** Modern sans-serif fonts (e.g., *Plus Jakarta Sans*, *Inter*).
* **Color Palette:**
  * **Dark Mode:** Deep Charcoal (`#0F172A`), Slate Gray (`#1E293B`), Accent Emerald Green (`#10B981`) and Soft Violet (`#8B5CF6`).
  * **Light Mode:** Crisp Soft White (`#F8FAFC`), Clean Slate (`#E2E8F0`), Indigo (`#6366F1`).
* **Micro-interactions:** Smooth hover effects, clean state changes, subtle card shadows. Strictly avoiding overly saturated gradients or cluttered banners to prevent a "tacky" look.

---

## 4. Detailed Feature Requirements

### 4.1 Authentication & Profile Management
* **Registration & Login:**
  * Email & Password registration with instant validation.
  * Quick OAuth option (e.g., Google Sign-In).
* **Profile Personalization:**
  * Custom Username setting.
  * Profile Picture Upload (with instant preview and fallback avatar generator).

### 4.2 Monthly Budget & Cash Flow Management
* **Initial Monthly Budget Setup:**
  * Users can input their total available money for the active month.
* **Dynamic Balance Adjustment:**
  * **Top-Up Feature:** Allows users to add additional funds at any point during the month. Balance updates automatically (`Current = Initial + TopUps - Total Expenses`).
  * **Expense Deduction:** Every recorded transaction instantly reduces the available balance.
* **Automatic Timestamping:**
  * Every entry (income or expense) automatically logs the exact date, day, and time (e.g., `Monday, 25 Oct 2026 - 14:30`).
  * Option to backdate/adjust the date manually if recording late.

### 4.3 Categorized Expense Tracking

#### A. Consumer Goods / FMCG (Barang Konsumsi)
Dedicated to items that get used up over time (skincare, groceries, toiletries, etc.).
* **Fields:**
  * Item Name (e.g., *Facial Wash*)
  * Price (e.g., *Rp 85,000*)
  * Brand / Merek (e.g., *Cerave*)
  * Net Weight / Quantity (e.g., *100 ml / 500 gr / 12 pcs*)
  * **Estimated Usage Lifespan (Lama Pemakaian):** Number of days/weeks the item is expected to last.
* **Smart Restock & Cost-Per-Day Engine:**
  * Calculates daily cost (`Price ÷ Estimated Days`).
  * Projects the exact "Restock Date" so users know when they actually need to repurchase, preventing unnecessary impulse buys.

#### B. Non-Consumer Expenses (Di Luar Konsumsi)
Dedicated to services, entertainment, bills, and one-time purchases.
* **Fields:**
  * Item / Transaction Name
  * Price / Amount
  * Sub-category (e.g., *Entertainment, Hangout, Subscriptions, Utilities, Fashion*).

### 4.4 Theme & UX Enhancements
* **Dark / Light Mode Switcher:**
  * Seamless theme toggle with persistent state saved in local browser storage or user profile.
* **Responsive Layout:**
  * Navigation sidebar/bottom bar optimized for both desktop views and mobile tap targets.

---

## 5. Innovative & Value-Add Features (Unthought Ideas)

1. **"Vibe Check" Financial Health Indicator:**
   * A dynamic, friendly status widget at the top of the dashboard showing financial status based on daily burn rate (e.g., *"Safe Zone 🟢"*, *"Watch Out 🟡"*, or *"Broke Alert 🔴"*).
2. **Cost-Per-Day Insights:**
   * Re-frames big purchases into daily value (e.g., *"Your Rp 300,000 sunscreen costs you only Rp 5,000/day"*).
3. **Impulse Cooling-Off Wishlist (48-Hour Cooldown):**
   * A dedicated tab where users log non-essential items they want to buy. The app sets a 48-hour countdown timer before allowing it to be marked as "Purchased" to prevent impulse spending.
4. **Monthly Breakdown Visualizer:**
   * Clean pie charts and progress bars showing the ratio of *Consumer Goods vs. Non-Consumer Expenses*.

---

## 6. Data Model / Schema Overview

### User Table
* `id` (PK)
* `username` (String)
* `email` (String)
* `profile_picture_url` (String)
* `created_at` (Timestamp)

### Monthly Budget Table
* `id` (PK)
* `user_id` (FK)
* `month_year` (String, e.g., "2026-10")
* `starting_balance` (Decimal)
* `current_balance` (Decimal)

### Transactions Table
* `id` (PK)
* `user_id` (FK)
* `type` (Enum: `INCOME`, `EXPENSE_CONSUMABLE`, `EXPENSE_NON_CONSUMABLE`)
* `title` (String)
* `amount` (Decimal)
* `brand` (String, Optional)
* `net_weight` (String, Optional)
* `usage_duration_days` (Integer, Optional)
* `estimated_empty_date` (Date, Optional)
* `category` (String)
* `timestamp` (Timestamp - Auto Generated)

---

## 7. Non-Functional Requirements (NFR)
* **Performance:** Dashboard load time < 1.0 second.
* **Usability:** Minimum 3-tap rule to record any transaction.
* **Data Security:** Encrypted passwords and secure profile image uploads.