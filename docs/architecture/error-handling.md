# Error Handling — Muzammil Store POS

Reference for how every layer of the app handles failure. Every new feature should
map its failure cases onto these categories before it's considered done.

## Categories

1. **Input errors** — missing required fields; invalid price/quantity/discount; invalid phone/CNIC format.
2. **Business errors** — insufficient stock; inactive product selected; duplicate username; duplicate
   product variant (same product + size + color); payment total mismatch.
3. **Authentication errors** — wrong username/password; inactive user; session expired; unauthorized
   role access (e.g., cashier hitting an admin-only action).
4. **Hardware errors** — thermal printer not connected; paper out; PDF generation failed.
5. **System errors** — database unavailable; backup failed; file/image upload failed.

## Non-negotiable rules

- **Every error shows a clear, human-readable message to the user** (Urdu or English, matching the
  active interface language) — never a raw stack trace or technical string in the UI.
- **Every error also logs technical details** (stack trace, context, timestamp) to a log file for
  later debugging — logs are for developers, UI messages are for the shop staff.
- **A sale must never be left half-saved.** Sale creation = validate stock → save invoice → save
  payment(s) → decrement stock → (best-effort) print receipt, all wrapped in a single database
  transaction. If any step before printing fails, the whole transaction rolls back. Printing failure
  itself must NOT roll back a successfully saved sale — it should instead surface a "Sale saved,
  but printing failed — reprint from Sales" message (hardware error, handled separately from the
  business transaction).
- **Same rule for stock adjustments and supplier payments** — anything that touches money or stock
  quantity is transactional.

## Suggested implementation shape

- A shared `AppError` class (or a small family of subclasses per category) thrown from services,
  caught at the IPC/controller boundary, and translated into `{ code, messageKey, details? }` sent
  to the renderer. `messageKey` maps to an i18n string so the same error is correctly shown in
  English or Urdu.
- Toast/inline messages for input and business errors (non-blocking, actionable).
- A modal or blocking banner for authentication and system errors (session expired, DB unavailable) —
  these usually need the user to stop and do something (log in again, check the printer, contact support).
- All errors logged with enough context to reconstruct what happened (user id, screen, action, payload
  summary — never full passwords) into `LOG_DIR` from `.env`.
