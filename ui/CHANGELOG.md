# Changelog

## 1.2.0

### Minor Changes

- 1d0a44e: Mobile dropdowns, grid icons, collections banner styling, UX improvements, and bug fixes

  - Added mobile dropdown navigation improvements to marketplace header
  - Implemented grid/list view toggle with icons (Square, Grid3x3) across product listings
  - Enhanced collections banner styling and page layouts
  - Added "View All" collection support with improved filtering and sorting options
  - Fixed mobile responsive spacing and layout issues on homepage
  - Improved product card and size selection modal UX
  - Added search and filter capabilities to collections pages
  - Fixed checkout and order confirmation page styling

## 1.1.0

### Minor Changes

- acee170: Add badge editing capability to collections admin panel - collections can now have customizable badge labels displayed on the homepage carousel

### Patch Changes

- acee170: Fix collections filter to use correct `useCollections()` API hook instead of deprecated `useCategories()`
- acee170: Fix collections filter not updating product results - added collectionFilter to useMemo dependencies and Clear All handler
- acee170: Fix mobile homepage lower box to display "Represent the NEAR protocol IRL" content instead of repeating carousel collection content
- acee170: Fix mobile products page single view to display all products in a single column instead of just one item
- acee170: Remove grid view toggle buttons from homepage - should only be available on the products page

## 1.0.0

### Major Changes

- 97e1666: v1 release of the merch store with printful fulfillment and pingpay payments

All notable changes to this package will be documented in this file.

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.1.0] - 2026-02-05

### Added

- Initial UI package structure
- Product marketplace pages
- User authentication flow
- Shopping cart functionality
- Checkout process
- Admin dashboard
- Profile management
- Responsive design with Tailwind CSS
