# Privacy

This page describes how `CostAwareRouter` (an exploratory project by Aiden,
contact via [GitHub](https://github.com/Accuoa/cost-aware-router)) handles your information.

## What we collect

If you submit your email via the signup form, we store:

- A salted hash of your email address (so we can dedupe without holding
  the plaintext after confirmation)
- A salted hash of your IP address (for rate-limiting)
- The HTTP `Referer` header (if your browser sends one)
- The project ID (`cost-aware-router`) so we know which page you signed up from
- A unique confirmation token (until you confirm or the row is purged)

We send a single confirmation email via Resend. If you don't click the
confirmation link, we keep the unconfirmed row for 30 days and then delete it.

## What we do not collect

- We do not run third-party analytics on this page beyond aggregate, IP-anonymized
  pageviews via self-hosted [Umami](https://umami.is)
- We do not place advertising cookies
- We do not sell or share your information with third parties

## Your rights (GDPR / CCPA)

You can request:

- Access to whatever record we hold for your email (a single row)
- Deletion of that row
- Correction of any field

Email [259742773+Accuoa@users.noreply.github.com](https://twitter.com/aidenbolin) and we'll respond within 30 days.

You can also unsubscribe at any time via the link in any email we send you.

## Retention

- Confirmed rows: kept until you unsubscribe or the project is concluded
- Unconfirmed rows: 30 days
- IP and Referer hashes: same retention as the row

## Data location

Stored on a Hostinger VPS in Europe. Backed up encrypted to the same provider.
We do not transfer your data outside the provider's footprint.

## Changes to this policy

If we change this policy materially, we will email everyone with a confirmed
signup before the change takes effect.

_Last updated: 2026-05-05_
