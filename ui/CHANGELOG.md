# Changelog

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
