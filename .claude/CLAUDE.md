# Portable Office Cabin — Claude Project Instructions

## Project stack

- Next.js 15 App Router
- React and TypeScript
- Tailwind CSS and shadcn/ui
- Supabase
- Razorpay
- Follow the existing project structure, component patterns and naming conventions.
- Reuse existing utilities, components, database functions and business logic before creating new ones.
- Do not create mock implementations or placeholder production data.
- Do not add new packages unless they are genuinely necessary.
- Do not replace a complete working implementation with a simplified version.

## Before changing code

- Inspect all related files, API routes, database types, migrations and existing business logic first.
- Identify the actual source of truth before modifying products, prices, quotations, shipping, checkout, database records or calculations.
- Preserve all existing working features unless the user explicitly requests a replacement.
- Do not make destructive database changes.
- Supabase migrations must be idempotent and safe to run more than once.
- Never run `full_schema.sql` against production.
- Do not assume an incomplete feature can be removed.
- Check how the change affects admin, customer-facing pages, API routes, exports, calculations and stored records.

## Admin panel safety rules

- Never delete any existing admin-panel feature, page, tab, section, field, button, workflow, configuration, permission, database record, API route, migration or working code unless the user explicitly requests deletion.
- Upgrades, additions, extensions, redesigns and non-destructive improvements are allowed.
- Existing admin-panel functionality and data must always be preserved by default.
- Do not remove a feature because it appears unused, duplicated, outdated, unfinished or unnecessary.
- Do not delete production data, database rows, columns, tables, storage files, quotations, invoices, customers, products, warranty records or user accounts.
- Do not rename or replace database fields without checking every dependency.
- Before refactoring or replacing functionality, confirm that the new implementation preserves every existing capability.
- Prefer archiving, disabling, hiding behind a feature flag, deprecating or backing up instead of deleting.
- Maintain backward compatibility wherever practical.
- Any destructive action requires:
  1. A clear explanation of exactly what will be removed.
  2. A list of affected features and data.
  3. A rollback or backup plan.
  4. Explicit user approval before proceeding.
- Never perform automatic cleanup that deletes existing files, records, components or configurations.
- After every admin-panel update, verify that existing:
  - Pages
  - Forms
  - Buttons
  - Permissions
  - Saved records
  - Exports
  - Calculations
  - Reports
  - Filters
  - Search
  - Database operations
  still work correctly.
- Never claim an admin-panel task is complete if any existing functionality or data was lost.

## Google Merchant Center rules

Merchant Center compliance is business-critical.

For every product included in the Merchant feed:

- The product must have one fixed GST-inclusive price.
- The same price must appear on:
  - Product card
  - Product page
  - Add to Cart
  - Cart
  - Checkout
  - Razorpay order
  - Product JSON-LD
  - Merchant feed
- Do not display conflicting price ranges, old prices, crossed-out prices, starting prices, approximate prices or unrelated ₹ amounts.
- Quote-only, enquiry-only, call-for-price and price-on-request products must not be included in the Merchant feed.
- A made-to-order product may remain eligible only when it has a fixed price and can be ordered and fully paid for online.
- Add to Cart and full online checkout must work for every submitted product.
- Shipping charges must be known and displayed before payment.
- Merchant Center shipping must match the cart, checkout and Razorpay payable amount.
- Availability must match the actual purchasing status.
- Product JSON-LD must exactly match the visible product information.
- Do not claim nationwide free shipping unless it is genuinely available.
- Terms, Privacy, Payment, Shipping, Refund and Cancellation policies must match the real checkout process.

Do not mark Merchant Center work as complete until every submitted product passes:

- Product card price
- Landing-page price
- Cart price
- Checkout price
- Razorpay payable amount
- JSON-LD price
- Merchant feed price
- Availability
- Shipping
- Direct purchase test

## Protected anonymous purchase flow — do not modify without approval

The Google Merchant Center anonymous purchase flow is production-critical and is currently approved and working.

### Mandatory protected behaviour

- Customers must be able to use Cart and Checkout without signing in.
- Never display “Please Sign In”, “Login Required” or any similar restriction on Cart or Checkout.
- Guest cart information must persist in localStorage and survive page reloads.
- Checkout must wait until guest-cart hydration is complete before checking whether the cart is empty.
- Never redirect Checkout during SSR, initial render or before cart hydration finishes.
- Empty-cart redirection may run only after hydration and inside a client-side effect.
- Fixed-price purchasable products must show the approved GST-inclusive price and Add to Cart button.
- Quote-only, custom-price, unavailable and price-unconfirmed products must remain excluded from online purchase and the Merchant feed.
- Cart, Checkout, JSON-LD, Merchant feed and Razorpay must use the same approved price.
- Do not change GST, shipping, transport, subtotal or Razorpay calculations during unrelated tasks.

### Protected product identity behaviour

Supabase or admin product records must not replace the static catalogue identity used by commerce logic.

During product merging:

- Preserve the static product `id`.
- Preserve the static product `sku`.
- Preserve the commerce identity used by:
  - `getCommerce()`
  - `isPurchasable()`
  - Add to Cart
  - Cart pricing
  - Checkout pricing
  - Product JSON-LD offers
  - Merchant feed eligibility
  - Razorpay order validation
- Database records may update approved presentation and content fields.
- Never replace a valid static product identifier with a Supabase UUID when commerce configuration is keyed by the static identifier.

### Protected mobile layout behaviour

- Cart and Checkout must not create horizontal scrolling.
- Cart buttons must remain inside the viewport.
- Product images, quantity controls and remove controls must remain visible.
- Long checkout button text must wrap safely on mobile.
- Long product names must not push prices outside the viewport.
- Do not use `overflow-x-hidden` to conceal layout defects.
- Preserve the approved Cart and Checkout layout at:
  - 320px
  - 360px
  - 390px
  - 430px
  - 768px
  - 1440px

### Protected files and logic

Treat the following as protected production areas:

- `src/contexts/CartContext.tsx`
- `src/lib/products/merge.ts`
- `src/views/Cart.tsx`
- `src/views/Checkout.tsx`
- Product commerce identity and purchasability logic
- Merchant feed eligibility logic
- Product JSON-LD offer logic
- Razorpay order calculation and server-side validation logic

Do not modify these protected files during an unrelated task merely because it is convenient.

### Required approval before changing protected behaviour

Before modifying any protected file or behaviour:

1. Stop before editing.
2. Explain exactly why the protected file must be changed.
3. List every protected file proposed for modification.
4. Explain whether the change affects:
   - Guest checkout
   - Cart persistence
   - Product identity
   - Product pricing
   - Merchant feed eligibility
   - JSON-LD
   - GST
   - Shipping
   - Razorpay
   - Mobile overflow
5. Show the intended behavioural change.
6. Explain the regression risk.
7. Wait for explicit user approval.

General requests such as “improve checkout”, “update the UI”, “refactor”, “optimise”, “clean the code” or “make it responsive” do not count as approval to change protected commerce behaviour.

Approval is valid only when the user clearly states:

“I approve changing the protected Merchant purchase flow.”

Without that approval, preserve the current implementation.

### Mandatory regression verification

Any approved modification involving the protected flow must be tested in a completely fresh anonymous browser context with no login and no pre-seeded cart.

Verify at both 320px and 1440px:

- A feed-eligible fixed-price product page loads.
- Approved price is visible.
- Add to Cart is visible and works.
- Cart contains the correct product.
- No login requirement appears.
- Guest cart survives reload.
- Checkout waits for cart hydration.
- Checkout does not redirect prematurely.
- Contact fields render.
- A valid delivery PIN code can be entered.
- Transport calculation completes.
- Cart and Checkout totals match.
- Payment button becomes enabled.
- No horizontal overflow exists.
- No hydration warning occurs.
- No SSR `location is not defined` error occurs.
- Quote-only products remain non-purchasable.
- Merchant feed products resolve through valid commerce identities.

Do not mark any related task complete unless these tests pass.

## Pricing rules

- Product prices displayed to customers must clearly state whether GST is included.
- Merchant products must use the approved GST-inclusive price.
- Never independently invent, calculate or change an approved product price without checking the configured source of truth.
- Search the entire landing page for conflicting ₹ values, including:
  - Descriptions
  - Specification tables
  - FAQs
  - SEO content
  - Hidden content
  - Related sections
  - Promotional sections
  - Structured data
- Cart and checkout values must be calculated from the same trusted source of truth.
- Optional charges must not be added unless the customer selects them.

## Razorpay and checkout rules

- Never expose Razorpay keys, secrets or webhook secrets in client-side code.
- Razorpay order amounts must use integer paise.
- Verify payment signatures on the server.
- Clearly show:
  - Product price
  - GST
  - Shipping
  - Installation
  - Optional items
  - Final payable total
  before payment.
- Preserve guest checkout.
- Do not silently change prices between product page, cart and payment.
- Payment success and failure states must be handled properly.
- Do not mark an order as paid without verified payment confirmation.
- Webhook processing must be idempotent.

## Database and Supabase rules

- Preserve existing production data.
- Never drop tables, columns, policies or functions without explicit approval.
- Create migrations for database changes.
- Migrations must be idempotent where practical.
- Do not overwrite existing migrations that may already be applied.
- Do not use the service-role key in client-side code.
- Respect existing RLS policies and role checks.
- Validate database changes against existing admin and customer workflows.
- Add new fields with safe defaults where necessary.
- Backfill existing data safely when adding required fields.
- Report clearly when a migration must be manually applied.

## Code quality

- Use strict TypeScript.
- Avoid `any` unless there is no reasonable typed alternative.
- Handle loading, empty, success and error states.
- Maintain responsive mobile and desktop layouts.
- Preserve accessibility labels, focus states and keyboard operation.
- Avoid duplicate components and duplicate business logic.
- Use server components by default and client components only when required.
- Keep business calculations in shared utilities rather than duplicating them across pages.
- Do not suppress TypeScript, ESLint or runtime errors without fixing the cause.
- Do not leave temporary debugging code, console logs or test data in production code.
- Keep existing UI styles unless the task specifically requests a redesign.

## File and Git safety

- Review `git diff` before completing any task.
- Review `git status` for modified and untracked files.
- Ensure all necessary new files are included with `git add`.
- Do not commit generated cache files such as `tsconfig.tsbuildinfo`.
- Do not delete files simply because they appear unused.
- Do not overwrite user-created files without checking their contents.
- Do not commit secrets, `.env`, `.env.local`, API keys or service-role credentials.
- Preserve existing branches and Git history.
- Do not use destructive Git commands such as `git reset --hard`, `git clean -fd` or force push unless explicitly approved.

## Verification

After every implementation:

1. Run TypeScript type checking.
2. Run ESLint.
3. Run relevant automated tests.
4. Run the production build.
5. Review `git diff`.
6. Review `git status`.
7. Confirm all required new and modified files are included.
8. Confirm no existing feature or data was deleted.
9. Test affected admin-panel workflows.
10. Test affected customer-facing workflows.
11. Test affected calculations, exports and database operations.
12. Perform manual verification where automation is insufficient.
13. When Cart, Checkout, product merging, product identity, pricing or Merchant feed logic is touched, run the complete protected anonymous purchase-flow regression test at 320px and 1440px.

Do not claim a task is complete when:

- Typecheck fails.
- Lint fails.
- Build fails.
- Required tests fail.
- Required migrations are not created or applied.
- Untracked implementation files are omitted.
- Existing functionality was removed.
- Production data was deleted.
- Merchant prices remain inconsistent.
- Checkout or shipping remains unverified.
- Manual verification has not been completed.
- The protected anonymous purchase flow has not been regression-tested after a related file was changed.
- A protected file was changed without explicit user approval.

## Completion report

At the end of every task, report:

- Files changed
- Features added or updated
- Existing functionality preserved
- Database changes
- Migrations created
- Tests performed
- Typecheck result
- Lint result
- Build result
- Manual verification completed
- Git status
- Remaining risks
- Required manual actions