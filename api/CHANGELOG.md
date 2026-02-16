# Changelog

## 1.0.1

### Patch Changes

- baf2af7: Harden ShippingAddress input parsing by trimming strings and treating empty optional fields (e.g. phone/state) as undefined.

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

- Initial API package structure
- Product catalog endpoints
- Order management services
- Payment integration (Stripe, PingPay)
- Fulfillment providers (Printful, Gelato)
- Authentication hooks
- Database schema and migrations
