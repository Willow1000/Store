---
name: frontend-design
description: "Use when: reformatting e-commerce page layouts to match the modern design system. Applies design patterns from demo.html (2-column layouts, grid structures, spacing) consistently across ProductDetail, Checkout, and other marketplace pages."
---

# Frontend Design System Implementation

## Overview
This skill provides a systematic workflow for reformatting e-commerce page components to align with the modern marketplace design system. It ensures consistent application of layout patterns, spacing, typography, and component styling derived from the demo.html reference implementation and DESIGN_SYSTEM.md specifications.

**Use this skill when:**
- Reformatting existing pages to match design system standards
- Creating new pages that need to follow the established patterns
- Verifying component consistency across the marketplace
- Implementing grid layouts, spacing, and responsive behavior

## Step 1: Identify Page Structure & Target Pattern

### Analysis Phase
1. **Review the current page layout**
   - Identify the main content sections
   - Note existing component hierarchy and styling
   - Check for responsive breakpoints

2. **Determine target pattern** from demo.html:
   - **2-Column Product Views** (ProductDetail, similar layouts):
     - Left: Image gallery with thumbnail grid
     - Right: Product information (title, price, specs, actions)
   - **Multi-Row Checkout Flows** (Checkout, OrderDetail):
     - Vertically stacked form sections
     - Summary sidebars (desktop) / collapsible (mobile)
   - **Grid Lists** (Products, Orders, Similar Items):
     - 4-column max (lg:grid-cols-4)
     - Responsive: 1 col (mobile), 2 col (tablet), 4 col (desktop)

3. **Reference materials**:
   - **demo.html**: Source of truth for visual structure and CSS classes
   - **DESIGN_SYSTEM.md**: Color palette, typography, spacing system, component specs
   - **Existing implementations**: ProductDetail.tsx (completed reference)

## Step 2: Map Layout Components

### Component Patterns to Apply

**Layout Containers**
```
Main wrapper: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Two-column grid: lg:grid lg:grid-cols-2 lg:gap-x-8
Item grids: grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4
```

**Spacing (8px base unit)**
- Padding/gaps: 4px (xs) → 64px (3xl)
- Sections: 16px (md), 24px (lg), 32px (xl) vertical spacing
- Cards: p-4 or p-6 internal padding

**Image Sections**
- Main product image: min-h-[400px] p-4 object-contain bg-white rounded shadow
- Thumbnails: grid-cols-4 gap-4, h-24 boxes, rounded-md
- Grid images: h-48 object-contain, aspect-ratio preserved

## Step 3: Extract Design Elements

### Typography (from DESIGN_SYSTEM.md)
- **Titles**: text-3xl font-extrabold (product names)
- **Headings**: text-2xl font-bold (section titles)
- **Body text**: text-base font-normal with leading-relaxed
- **Secondary text**: text-gray-600 for descriptions/specs
- **Labels**: text-sm text-gray-500 for field labels, "(Estimated)" tags

### Color Palette
- **Primary backgrounds**: white (cards), light gray (#F5F5F5) (sections)
- **Text**: black (#000000) primary, gray (#808080) secondary
- **CTAs**: Blue for informational buttons, follow design spec for action buttons
- **Accents**: Use semantic colors for status (success, error, warning)

### Interactive Elements
- **Buttons**: 
  - Primary CTA: Full width or standard width with consistent padding
  - Secondary: Outlined style with border
  - Icon buttons: Use Lucide icons, 24px default size
- **Form inputs**: 
  - Border: 1px solid #CCCCCC
  - Focus: 2px solid #000000
  - Padding: px-4 py-2
  - Border-radius: rounded (4-6px)

## Step 4: Apply Component Updates

### Common Refactoring Tasks

**Product Detail / Similar Items Pattern**
1. Ensure 2-column layout on desktop (lg:grid lg:grid-cols-2)
2. Image gallery on left with thumbnail selector (grid-cols-4)
3. Product details on right with organized sections
4. Similar items section: title + grid (max lg:grid-cols-4)
5. Action buttons: Add to Cart (primary), Wishlist (icon)

**Form/Checkout Pattern**
1. Max width container with consistent padding
2. Sections organized vertically with clear spacing
3. Form fields with proper styling (border, focus states)
4. Summary sidebar on right (desktop) or below (mobile)
5. Action buttons at bottom with proper contrast

**List/Grid Pattern**
1. Container with max-width and centered padding
2. Grid responsive: 1 col (mobile) → 2 col (tablet) → 4 col (desktop)
3. Each item: card styling (bg-white, shadow, rounded)
4. Gap consistency: gap-y-10 gap-x-6 or gap-4 (adjust as needed)
5. Image placeholder: aspect-ratio maintained, object-contain

## Step 5: Verify & Quality Check

### Alignment Checks
- [ ] Layout matches demo.html structure exactly
- [ ] Responsive breakpoints: mobile (sm), tablet (md/lg), desktop (lg+)
- [ ] Spacing consistent with 8px unit system
- [ ] Typography follows DESIGN_SYSTEM.md sizes and weights
- [ ] Colors match semantic palette (black, white, grays, accents)

### Functionality Checks
- [ ] All interactive elements remain functional
- [ ] Form inputs/buttons respond correctly
- [ ] Image loading and sizing work as expected
- [ ] Scroll behavior and overflow are handled
- [ ] Mobile responsiveness does not break layout

### Visual Consistency Checks
- [ ] Shadows match design system (subtle, 0 2px 8px rgba(0,0,0,0.1))
- [ ] Border radius consistent (4-8px)
- [ ] Button styling and sizing aligned with other pages
- [ ] Icon sizes and colors match usage context
- [ ] Text contrast meets accessibility (WCAG AA minimum)

## Decision Tree

**Q: Should I use grid-cols-4 or grid-cols-3?**
→ Check demo.html and DESIGN_SYSTEM.md. Default is 4 for product grids; adjust only for specific page requirements.

**Q: What spacing between sections?**
→ Use vertical spacing: md (16px), lg (24px), or xl (32px) depending on section importance.

**Q: How to handle responsive images?**
→ Use `object-contain` for product images (preserves aspect ratio), `object-cover` for card backgrounds.

**Q: Should buttons be full-width or standard?**
→ Full-width on mobile (w-full), standard width with consistent sizing on desktop (check existing patterns).

**Q: When to use which gray shade?**
→ Light gray (#F5F5F5) for backgrounds, medium gray (#808080) for secondary text, dark gray (#1A1A1A) for subtle overlays.

## Implementation Checklist

**Before Starting**
- [ ] Review target page's current implementation
- [ ] Read demo.html for the corresponding section
- [ ] Identify components needing updates
- [ ] Check ProductDetail.tsx for reference patterns

**During Implementation**
- [ ] Update layout containers and grids
- [ ] Apply typography and sizing
- [ ] Implement spacing and padding
- [ ] Verify color usage and contrast
- [ ] Test responsive behavior at all breakpoints

**After Completion**
- [ ] Run visual regression check against demo.html
- [ ] Verify all functionality still works
- [ ] Test on mobile, tablet, desktop
- [ ] Document applied pattern in repo memory
- [ ] Consider if other pages need same pattern

## Common Patterns Reference

### Pattern: 2-Column Product View
**File**: ProductDetail.tsx (reference)
**Structure**: Left image + thumbnails, Right title/price/specs/buttons
**Grid**: lg:grid-cols-2, left image min-h-[400px], thumbnails grid-cols-4
**Spacing**: gap-x-8 between columns, gap-4 for thumbnails

### Pattern: Form/Checkout
**File**: Checkout.tsx (needs implementation)
**Structure**: Vertically stacked sections with summary sidebar
**Responsive**: Single column on mobile, 2-column on desktop (form left, summary right)
**Spacing**: lg-24 sections, md-16 form groups

### Pattern: Grid Lists
**File**: Products.tsx, Orders.tsx (reference patterns)
**Structure**: Responsive grid of items with image/title/meta
**Grid**: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4, gap-y-10 gap-x-6
**Cards**: bg-white shadow rounded-lg p-4/p-6

## Related Documentation
- **Design System**: `/DESIGN_SYSTEM.md` - Colors, typography, spacing, components
- **Demo Reference**: `/demo.html` - Visual implementation reference
- **Current Implementation**: `/client/src/pages/ProductDetail.tsx` - Completed example
- **Next Pages**: Checkout.tsx, Orders.tsx (candidates for this pattern)

## Troubleshooting

**Layout breaking on mobile**
→ Check grid responsive classes: ensure grid-cols-1 for mobile, progressive increase for larger screens.

**Spacing inconsistent**
→ Verify gap and padding use 8px multiples (4, 8, 16, 24, 32, 48, 64). Use Tailwind utilities: gap-4, px-6, py-8.

**Images not displaying correctly**
→ Check object-fit (contain vs cover), aspect ratio, min-height, and parent container sizing.

**Typography not matching**
→ Verify font-size, font-weight, and line-height classes match DESIGN_SYSTEM.md specs.

**Colors appear wrong**
→ Check for conflicting Tailwind overrides. Verify exact color hex values if using custom colors.
