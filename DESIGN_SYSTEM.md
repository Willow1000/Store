# Design System - Modern E-Commerce Marketplace

## Overview
This document outlines the design system for the modern e-commerce marketplace, inspired by eBay, StockX, and the provided Figma design. The core aesthetic is **clean, minimal, and modern** with a **black and white primary color palette**.

## Color Palette

### Primary Colors
- **Black**: `#000000` - Primary text, headers, strong CTAs, borders
- **White**: `#FFFFFF` - Background, cards, clean spaces
- **Dark Gray**: `#1A1A1A` - Secondary backgrounds, hover states
- **Light Gray**: `#F5F5F5` - Tertiary backgrounds, subtle dividers
- **Medium Gray**: `#808080` - Secondary text, disabled states

### Accent Colors
- **Red/Coral**: `#E63946` - Primary CTA buttons, alerts, "Buy Now" actions (inspired by eBay/StockX)
- **Green**: `#06A77D` - Success states, verified badges
- **Amber/Orange**: `#F77F00` - Warnings, deals/discounts

### Semantic Colors
- **Success**: `#06A77D`
- **Error**: `#E63946`
- **Warning**: `#F77F00`
- **Info**: `#0066CC`

## Typography

### Font Family
- **Primary Font**: Inter (modern, clean, highly legible)
- **Fallback**: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

### Font Sizes & Weights
- **Display/Hero**: 48px, Weight 700 (Bold)
- **Heading 1**: 36px, Weight 700 (Bold)
- **Heading 2**: 28px, Weight 600 (SemiBold)
- **Heading 3**: 24px, Weight 600 (SemiBold)
- **Body Large**: 18px, Weight 400 (Regular)
- **Body**: 16px, Weight 400 (Regular)
- **Body Small**: 14px, Weight 400 (Regular)
- **Caption**: 12px, Weight 400 (Regular)
- **Button**: 16px, Weight 600 (SemiBold)

### Line Heights
- Display: 1.2
- Heading: 1.3
- Body: 1.5
- Caption: 1.4

## Spacing System

Using an 8px base unit for consistent spacing:
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px

## Components

### Buttons
- **Primary Button**: Black background, white text, 16px font, 12px vertical padding, 24px horizontal padding
- **Secondary Button**: White background, black border, black text
- **Tertiary Button**: Transparent, black text, underline on hover
- **Disabled State**: Gray background, light gray text, no cursor

### Cards
- **Product Card**: White background, subtle shadow (0 2px 8px rgba(0,0,0,0.1)), rounded corners (8px)
- **Order Card**: Similar to product card, with border on left (4px accent color)

### Input Fields
- **Border**: 1px solid #CCCCCC
- **Focus**: 2px solid #000000
- **Padding**: 12px 16px
- **Border Radius**: 4px
- **Font**: 16px, Regular

### Navigation
- **Top Nav Height**: 64px (desktop), 56px (mobile)
- **Background**: White with subtle shadow
- **Text**: Black, 16px Regular
- **Active State**: Black text with bottom border (2px)

### Modals & Dialogs
- **Overlay**: Semi-transparent black (rgba(0,0,0,0.5))
- **Modal Background**: White
- **Border Radius**: 8px
- **Padding**: 24px
- **Shadow**: 0 10px 40px rgba(0,0,0,0.2)

## Imagery & Icons

### Icons
- **Style**: Minimal, line-based (lucide-react)
- **Size**: 24px (default), 16px (small), 32px (large)
- **Color**: Black (primary), Gray (secondary)

### Product Images
- **Aspect Ratio**: 1:1 (square) for grid layouts
- **Background**: Light gray (#F5F5F5) for product placeholders
- **Border Radius**: 4px

## Responsive Breakpoints

- **Mobile**: 320px - 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

## Layout Grid

- **Desktop**: 12-column grid, 16px gutter
- **Tablet**: 8-column grid, 12px gutter
- **Mobile**: 4-column grid, 8px gutter

## Shadows

- **Subtle**: 0 2px 8px rgba(0,0,0,0.08)
- **Medium**: 0 4px 16px rgba(0,0,0,0.12)
- **Strong**: 0 10px 40px rgba(0,0,0,0.16)

## Border Radius

- **Small**: 4px
- **Medium**: 8px
- **Large**: 12px
- **Full**: 9999px (for pills/badges)

## Transitions & Animations

- **Standard Duration**: 200ms
- **Easing**: ease-in-out
- **Hover Effects**: Subtle scale (1.02), shadow increase
- **Loading States**: Spinner animation (200ms rotation)

## Accessibility

- **Contrast Ratio**: Minimum 4.5:1 for text on background
- **Focus States**: Visible 2px outline on all interactive elements
- **Touch Targets**: Minimum 44px x 44px for mobile
- **Font Size**: Minimum 16px for body text (prevents iOS zoom)

## Key Design Principles

1. **Simplicity**: Remove unnecessary elements; focus on content and functionality
2. **Hierarchy**: Use size, weight, and color to guide user attention
3. **Consistency**: Apply spacing, typography, and colors uniformly
4. **Whitespace**: Generous spacing creates breathing room and improves readability
5. **Contrast**: High contrast between text and background ensures legibility
6. **Responsiveness**: Design mobile-first, then enhance for larger screens
7. **Accessibility**: Ensure all users can navigate and interact with the platform

## Implementation Notes

- Use Tailwind CSS for all styling to maintain consistency
- Create reusable component library following this design system
- Test all components across browsers and devices
- Maintain design tokens in CSS variables for easy updates
- Document all custom components with usage examples
