---
name: Technical Intelligence System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#b9cbb9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849585'
  outline-variant: '#3b4b3d'
  surface-tint: '#00e479'
  primary: '#f1ffef'
  on-primary: '#003919'
  primary-container: '#00ff88'
  on-primary-container: '#007139'
  inverse-primary: '#006d37'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#f0ffed'
  on-tertiary: '#003915'
  tertiary-container: '#66fa8b'
  on-tertiary-container: '#007131'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#60ff99'
  primary-fixed-dim: '#00e479'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005228'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-page: 24px
  gutter-panel: 1px
  padding-card: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for precision, utility, and local-first privacy. It adopts a **High-Tech Minimalist** aesthetic that leans into the "Pro" utility of manual parsing. The personality is authoritative yet unobtrusive, prioritizing document readability and technical data extraction over decorative elements.

The visual narrative is driven by an ultra-dark environment, mimicking a terminal or high-end IDE. This creates a focused workspace where the "active" information—the bright neon green of the AI and the high-contrast paper of the PDF—stands out as the primary focal points. The style avoids all depth-based shadows in favor of structural lines, suggesting a lightweight, performant, and secure local application.

## Colors

The palette is built on a "Deep Space" grayscale to minimize eye strain during long-form reading. 

- **The Void (#0a0a0a):** Used for the main application background to provide maximum contrast for floating panels.
- **Neon Primary (#00ff88):** Reserved strictly for active system states, success indicators, and primary action highlights.
- **Functional Accents:** Amber (#f59e0b) is utilized to call out specific technical values (metrics, quantities) within chat responses, while a deeper Green (#22c55e) marks document citations and page references.
- **The Physical Bridge:** The PDF preview utilizes a near-white "paper" tone (#f5f5f0) to distinguish the digital AI environment from the physical document source.

## Typography

This design system uses a dual-font strategy to separate content from metadata.

**Geist (Sans-serif)** is the primary workhorse for the chat interface and document headers. It provides a clean, neutral legible experience for long-form AI explanations.

**JetBrains Mono (Monospace)** is used for all "System" level information. This includes file names, page numbers, status badges, and technical metrics. It reinforces the "Utility/Tool" nature of the product. 

Labels and badges should always use uppercase when using the Monospace font to enhance their "read-only" status-like appearance.

## Layout & Spacing

The layout follows a **Rigid Panel System**. Instead of traditional margins, the design uses 1px borders (#2a2a2a) to separate major functional areas (Sidebar, Chat, Preview).

- **Desktop:** A three-pane layout. The sidebar (Library) is fixed-width (280px), the Chat occupies the center fluidly, and the PDF Preview occupies a secondary fluid pane or overlay.
- **Mobile:** The layout collapses into a single-pane view with a bottom-sheet for chat input and a toggle for switching between the PDF and AI dialogue.
- **Rhythm:** An 8px base grid governs all internal padding. Cards and input fields use 16px internal padding.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Stark Outlines**, never through shadows.

1. **Level 0 (Base):** #0a0a0a (The background void).
2. **Level 1 (Panels):** #111111 (Large functional zones like the chat area).
3. **Level 2 (Cards/Inputs):** #1a1a1a (Interactive elements or grouped data).
4. **Boundary:** A consistent 1px solid border (#2a2a2a) defines the perimeter of every interactive element.

When a panel is "Active" or focused, the border color may transition to the primary neon green (#00ff88) or a slightly lighter gray (#444444).

## Shapes

The design system uses a **Soft-Technical** shape language. 

Standard components (buttons, cards, inputs) use a 4px (0.25rem) radius. This provides a subtle nod to modern hardware aesthetics without appearing too organic or "consumer-friendly" soft. 

Status indicators (the "Online" pulse) are the only elements allowed to be fully circular (pill/circle) to distinguish them from structural UI elements.

## Components

### Buttons & Inputs
- **Primary Button:** Ghost style with a 1px #00ff88 border and JetBrains Mono text. On hover, it gains a subtle #00ff88/10% background tint.
- **Chat Input:** A #1a1a1a container with a #2a2a2a border. Text is Geist Sans. Placeholder text is low-contrast gray (#555).
- **Dropzone:** Indicated by a dashed #2a2a2a border and a centered "Upload" icon.

### Cards & Lists
- **File Card:** Uses #1a1a1a background. Displays the file name in JetBrains Mono and a small status dot (#00ff88) if indexed.
- **AI Message:** No card background. The text sits directly on the #111 panel background, using a small "AI" label badge for identification.

### Badges & Chips
- **Page Reference:** Small #1a1a1a pill with a 1px border. Uses JetBrains Mono. Clicking scrolls the PDF preview to the corresponding section.
- **Status Badge:** A small dot (Primary Green) followed by "100% OFFLINE" or "INDEXED" in 10px JetBrains Mono.

### PDF Previewer
- The previewer should feel like a "window" into a different medium. The scrollbar should be minimal and dark, while the document itself maintains the #f5f5f0 paper color for maximum legibility of original text.