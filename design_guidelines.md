# FlashGenius Design Guidelines

## Design Approach

**Selected Approach**: Design System-Inspired (Notion + Linear)
**Justification**: Educational productivity tools require clarity, consistency, and efficiency. FlashGenius combines Notion's clean card-based layouts with Linear's refined typography and interaction patterns, optimized for focused learning experiences.

**Core Principles**:
- Clarity over decoration: Every visual element serves learning efficiency
- Progressive disclosure: Advanced features revealed contextually
- Instant feedback: All interactions provide immediate visual confirmation
- Focused workspace: Minimize distractions during study sessions

## Color System

**Brand & UI Colors** (HSL format - space separated):
- Primary: 239 84% 67% (indigo - main CTAs, active states)
- Secondary: 258 90% 66% (purple - premium features, gradients)
- Success: 158 64% 52% (emerald - generation complete, saved states)
- Background: 210 40% 98% (slate-50 - main canvas)
- Surface: 0 0% 100% (white - cards, modals)
- Text Primary: 215 25% 27% (slate-800 - headings, body)
- Text Secondary: 215 16% 47% (slate-600 - labels, meta)
- Accent: 38 92% 50% (amber - highlights, premium badges)
- Border: 214 32% 91% (slate-200 - dividers, card edges)
- Hover: 221 83% 53% (indigo-600 - interactive states)

**Dark Mode** (for study mode):
- Background: 222 47% 11% (slate-900)
- Surface: 217 33% 17% (slate-800)
- Text Primary: 210 40% 98% (slate-50)
- Border: 215 28% 17% (slate-700)

**Gradients** (use sparingly):
- Hero/Premium: `linear-gradient(135deg, hsl(239 84% 67%), hsl(258 90% 66%))`
- Success States: `linear-gradient(to right, hsl(158 64% 52%), hsl(142 71% 45%))`

## Typography

**Font Families**:
- Primary: Inter (body text, UI elements, forms)
- Display: Poppins (headings, hero, feature titles)

**Type Scale**:
- Hero: Poppins 3.5rem/1.1 (font-bold)
- H1: Poppins 2.5rem/1.2 (font-bold)
- H2: Poppins 2rem/1.3 (font-semibold)
- H3: Poppins 1.5rem/1.4 (font-semibold)
- Body Large: Inter 1.125rem/1.6 (font-normal)
- Body: Inter 1rem/1.6 (font-normal)
- Small: Inter 0.875rem/1.5 (font-medium)
- Caption: Inter 0.75rem/1.4 (font-medium, text-secondary)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 8, 12, 16, 24
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-24
- Card gaps: gap-4 to gap-8
- Form field spacing: space-y-4

**Grid Structure**:
- Dashboard: 240px fixed sidebar + flex-1 main content
- Content max-width: max-w-7xl (1280px)
- Cards: max-w-2xl for flashcard editor, max-w-4xl for generation form
- Form inputs: Full width within containers

**Breakpoints**:
- Mobile: base (stack all columns)
- Tablet: md: (2-column layouts start)
- Desktop: lg: (full sidebar, 3-column grids)

## Component Library

### Navigation
**Sidebar** (Desktop):
- Fixed 240px width, full height
- Logo + app name at top (p-6)
- Navigation items with icons (Heroicons), hover bg-slate-100, active bg-indigo-50 with indigo-600 text
- Bottom section for user profile + settings

**Top Bar** (Mobile):
- Hamburger menu, centered logo, profile icon
- Slides in sidebar overlay on tap

### Cards & Containers
**Flashcard Display**:
- min-h-64, perspective effect for flip animation
- Shadow: shadow-lg on hover, shadow-xl when active
- Border: 2px solid border-slate-200, rounded-xl
- Question/Answer sides with centered text, p-8
- Flip button positioned bottom-right

**Generation Form Card**:
- bg-white, rounded-xl, shadow-md, p-8
- Input sections with clear labels (text-sm font-medium text-slate-700)
- Tabbed interface for input methods (Text/Document/YouTube)
- Customization options in expandable sections

**Dashboard Cards**:
- Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3, gap-6)
- Hover effect: translate-y-[-4px] + shadow increase
- Deck preview with card count, last modified date
- Quick action buttons on hover overlay

### Forms & Inputs
**Text Inputs**:
- h-12, px-4, rounded-lg, border-2 border-slate-200
- Focus: border-indigo-500, ring-2 ring-indigo-100
- Placeholder: text-slate-400

**Textareas**:
- min-h-32, p-4, same border/focus as inputs
- Resize-y for user control

**Select Dropdowns**:
- Custom styled with Heroicons chevron-down
- Options with hover bg-slate-100

**File Upload**:
- Dashed border zone with upload icon
- Drag-over state: bg-indigo-50, border-indigo-300
- File list with delete option

**Customization Controls**:
- Card Type: Radio group with icon + label (Q&A, Cloze Deletion, Reverse)
- Granularity: Slider with labels (Low/Medium/High)
- Extra Notes: Toggle switch

### Buttons
**Primary**: bg-indigo-600 text-white, hover:bg-indigo-700, h-12, px-6, rounded-lg, font-semibold
**Secondary**: border-2 border-slate-300 text-slate-700, hover:bg-slate-50
**Success**: bg-emerald-500, hover:bg-emerald-600 (for "Generate" action)
**Outline on Images**: backdrop-blur-md bg-white/10 border-2 border-white/20 text-white

### Editor Interface
**Card List** (Left panel):
- Scrollable list, gap-2
- Each card: p-4, border-l-4 (color by type), hover bg-slate-50
- Selected card: bg-indigo-50, border-l-indigo-600

**Edit Panel** (Right):
- Large editable text areas for question/answer
- Delete confirmation modal
- Save indicator (auto-save with spinner)

### Data Display
**Generation History**:
- Table with columns: Date, Source, Cards, Actions
- Row hover: bg-slate-50
- Action buttons: icon-only, text-slate-600

**Statistics Cards**:
- Gradient backgrounds (light indigo/purple)
- Large number (text-4xl font-bold)
- Label below (text-sm text-slate-600)

### Feedback Elements
**Loading States**:
- Spinner: animated spin, text-indigo-600
- Skeleton screens for card previews

**Notifications/Toasts**:
- Slide in from top-right
- Success: bg-emerald-50 border-l-4 border-emerald-500
- Error: bg-red-50 border-l-4 border-red-500

**Empty States**:
- Centered icon (Heroicons, large, text-slate-300)
- Heading + description
- CTA button to create first deck

## Images

**Hero Section**: Full-width gradient background (indigo to purple) with floating card mockups showing flashcard examples. Image should be abstract/illustrative showing the concept of learning with cards, NOT stock photos of students.

**Feature Illustrations**: Custom or sourced illustrations for:
- Multi-format input (document icons, YouTube logo)
- AI generation (brain/sparkle iconography)
- Study modes (flip animation preview)

**Dashboard**: No hero image needed; focus on functional content cards and data visualization.

## Animation Constraints

**Use Sparingly**:
- Flashcard flip: 600ms 3D rotate transform
- Card hover: 200ms translate + shadow transition
- Button states: 150ms background/border
- Page transitions: 300ms fade
- Loading spinners only when necessary

**Avoid**: Parallax, scroll-driven animations, gratuitous micro-interactions that distract from studying.