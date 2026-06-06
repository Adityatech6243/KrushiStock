# KrushiStock Full Project Audit and Implementation Roadmap

Audit date: 2026-05-25  
Scope reviewed: `krushistock-backend/src`, `krushistock-frontend/src`, package scripts, routes, services, schemas, controllers, and key UI pages.  
Verification run: backend JS syntax check passed; frontend `npm.cmd run build` passed with a large bundle warning.

## Executive Status

KrushiStock is a working MERN inventory system with strong base CRUD coverage, JWT auth, stock updates, purchase invoice storage, reporting screens, WhatsApp invoice hooks, expiry views, and recommendation screens. It is not production-ready yet because the most important flows are not consistently ledger-driven: stock is stored in both `Product.quantity` and `Stock.quantity`, purchases write `StockMovement` but sales/manual/disposal changes do not, sales invoices are only persisted when WhatsApp is used, and payment reminders/settings/export features are partially mocked.

Estimated production readiness score: **68 / 100**

## Module-by-Module Status

| Module | Status | Notes |
|---|---:|---|
| Authentication | 75% | JWT works; frontend route guard is token-only; reset token uses normal JWT expiry; secrets have unsafe defaults. |
| Dashboard | 70% | Dynamic stats/charts exist; no live refresh/WebSocket/SSE; no expiry/reorder/payment KPIs. |
| Products/Categories | 80% | CRUD works; product and stock are duplicated; product creation not transactional with stock creation. |
| Stock/Inventory | 60% | Overview and low stock exist; no full movement ledger API; manual/disposal changes do not record `StockMovement`. |
| Purchases | 80% | Best-built flow: transaction-backed purchase, invoice, stock, movements; UI does not expose invoice history/PDF. |
| Sales/Billing | 65% | Stock deduction works; no `StockMovement`, no persisted sale invoice record except WhatsApp `InvoiceHistory`. |
| Farmers/Suppliers | 75% | CRUD works; farmer purchase history is product IDs only, not sale-line history. |
| Reports | 55% | Backend summaries exist; stock report movement columns are placeholders; CSV export is mock alert. |
| AI/Recommendations | 60% | Rule-based recommendations exist; no AI service integration, feedback loop, or inventory-aware ranking beyond quantity display. |
| Expiry/Waste | 65% | Useful views and status sync exist; disposal sets quantity to zero through product update without waste/audit ledger. |
| Notifications/WhatsApp | 60% | Models/services/routes exist; frontend only sends sale invoice; reminders are never generated from sales. |
| Settings | 25% | Frontend settings page is local/mock only; backend WhatsApp settings exist but are not connected to the UI. |

## Confirmed High-Priority Bugs and Data Risks

1. **Sales list and purchase list use the wrong date field.**  
   Frontend reads `row.date`, `sale.date`, and `purchase.date`, but backend returns `saleDate` and `purchaseDate`.  
   Files: `krushistock-frontend/src/pages/sales/SalesList.jsx`, `krushistock-frontend/src/pages/purchases/PurchaseList.jsx`.

2. **Stock source of truth is split.**  
   `Product.quantity` and `Stock.quantity` are both updated in many flows, but not all. `stockController.updateStock` updates `Stock` only; product update can overwrite stock; reports mix sources.  
   Files: `krushistock-backend/src/models/Product.js`, `src/models/Stock.js`, `src/controllers/productController.js`, `src/controllers/stockController.js`, `src/controllers/reportController.js`.

3. **Sales do not create stock movement logs.**  
   Purchases create `StockMovement`; sales/update/delete adjust stock but do not log movements. This makes inventory traceability incomplete.  
   Files: `krushistock-backend/src/controllers/saleController.js`, `src/models/StockMovement.js`.

4. **Sale invoice storage is incomplete.**  
   Sale PDFs are generated only by WhatsApp flow and logged to `InvoiceHistory`. A normal sale has no stored invoice PDF/history record.  
   Files: `krushistock-backend/src/services/whatsAppService.js`, `src/models/InvoiceHistory.js`, `src/controllers/saleController.js`, `src/utils/pdfGenerator.js`.

5. **Payment reminders are modeled but not created.**  
   `Reminder` cron exists, but no sale/payment flow creates reminder records or tracks due dates/amount paid.  
   Files: `krushistock-backend/src/models/Reminder.js`, `src/config/cron.js`, `src/controllers/saleController.js`.

6. **Stock report movement columns are placeholders.**  
   `openingStock`, `purchases`, `sales`, and `closingStock` are not calculated from `StockMovement`; purchases/sales are hardcoded to `0`.  
   File: `krushistock-backend/src/controllers/reportController.js`.

7. **Report export buttons are mock actions.**  
   CSV export currently shows alerts instead of exporting data.  
   Files: `krushistock-frontend/src/pages/reports/StockReport.jsx`, `SalesReport.jsx`, `PurchaseReport.jsx`.

8. **Settings are not persisted.**  
   Store settings are hardcoded in React state and not connected to MongoDB; PDF headers use hardcoded KrushiStock values.  
   Files: `krushistock-frontend/src/pages/settings/Settings.jsx`, `krushistock-backend/src/utils/pdfGenerator.js`.

9. **Sequential invoice numbers are race-prone.**  
   `countDocuments() + 1` can collide under concurrent sale/purchase creation.  
   Files: `krushistock-backend/src/models/Sale.js`, `src/models/Purchase.js`.

10. **Production config has unsafe defaults.**  
    `JWT_SECRET` and `MONGO_URI` have defaults; frontend API URL is hardcoded to localhost; backend `CLIENT_URL` defaults to port 3000 while Vite normally runs 5173.  
    Files: `krushistock-backend/src/config/env.js`, `krushistock-frontend/src/utils/constants.js`.

## Database Consistency Audit

| Relationship | Current State | Gap |
|---|---|---|
| Products -> Purchases | Purchase items reference Product; invoice snapshots product name/price. | Good base; no batch-level stock lots. |
| Products -> Sales | Sale items reference Product. | No movement ledger; no sale invoice record by default. |
| Suppliers -> Purchases | Purchase references Supplier; PurchaseInvoice stores supplierId and supplierName. | Good; UI missing purchase invoice history/PDF. |
| Farmers -> Sales | Sale has both `customer` and `farmerId`. | Duplicate reference fields can drift; standardize internally. |
| Inventory -> Billing | Sales decrement stock; purchases increment stock. | Needs single stock service and movement ledger for all stock-changing operations. |
| Invoices -> Payments | PurchaseInvoice has payment status; sales only have payment method. | Missing sales payment status, due date, amount paid, reminders, ledger. |

Potential orphan risks:
- Soft-deleted products/suppliers/farmers can remain referenced by purchases/sales, which is okay historically, but reports must handle missing populated docs.
- Product deletion does not remove/disable `Stock`; stock queries filter active product IDs but orphan stock can remain.
- Purchase deletion cancels invoice and deletes purchase; `PurchaseInvoice.purchase` then points to a deleted document.

## High Priority Implementation Plan

1. **Fix frontend date mismatches.**  
   Frontend: `SalesList.jsx`, `PurchaseList.jsx`. Use `saleDate` / `purchaseDate` in edit and table render.  
   Backend/API: no change.  
   Validation/UI: show correct date and preserve date during edit.

2. **Introduce a shared stock mutation service.**  
   Backend: create/extend `krushistock-backend/src/services/stockMovementService.js`; update `saleController.js`, `purchaseService.js`, `productController.js`, `stockController.js`, `inventoryController.js`.  
   MongoDB: use `StockMovement` for `purchase`, `sale`, `adjustment`, `disposal`, `correction`.  
   API: add `GET /api/v1/stock/movements`, `POST /api/v1/stock/adjustments`.  
   UI: add movement history in `StockOverview.jsx`.

3. **Persist sale invoices for every sale.**  
   Backend: create `SaleInvoice` model or generalize `InvoiceHistory`; update `saleController.js` to generate/store invoice PDF after committed sale.  
   MongoDB: sale invoice refs `sale`, `customer`, `invoiceNumber`, `pdfPath`, `status`, totals, payment fields.  
   API: `GET /api/v1/sales/:id/invoice`, `POST /api/v1/sales/:id/send-invoice`.  
   UI: add download/view invoice action in `SalesList.jsx`.

4. **Add sales payment tracking and reminders.**  
   Backend: extend `Sale.js` with `paymentStatus`, `amountPaid`, `amountDue`, `dueDate`; create/update `Reminder` on unpaid/partial sales.  
   MongoDB: indexes on `paymentStatus`, `dueDate`, `customer`.  
   API: add payment update endpoint.  
   UI: sales form fields and overdue badges; optional reminder action.

5. **Make stock report ledger-driven.**  
   Backend: rewrite `getStockReport` to aggregate from `StockMovement` between dates.  
   Frontend: `StockReport.jsx` category filter should use category select/id, not free text if backend expects id.  
   API: support `startDate`, `endDate`, `category`, `product`, pagination/export.

6. **Replace mock exports with real CSV/XLSX.**  
   Backend option: add `/api/v1/reports/:type/export?format=csv`.  
   Frontend option: generate CSV from current `reportData` in `StockReport.jsx`, `SalesReport.jsx`, `PurchaseReport.jsx`.  
   UI: download file, not alert.

## Medium Priority Implementation Plan

1. **Persist system/store settings.**  
   Backend: add `StoreSettings` model/controller/routes; use settings in `pdfGenerator.js`.  
   Frontend: replace mock `Settings.jsx` submit with real service.  
   API: `GET/PUT /api/v1/settings/store`; optionally expose WhatsApp settings routes in UI.

2. **Role-aware frontend and backend permissions.**  
   Backend: apply `authorize('admin')` to destructive/settings/user/admin operations.  
   Frontend: hide `/users` and settings-only controls for staff; add role guard in `routes.jsx` and `Sidebar.jsx`.

3. **Dashboard live feeling.**  
   Backend: add compact stats for expiry, pending payments, reorder value; optionally SSE/WebSocket later.  
   Frontend: periodic refetch or SWR-style polling in `Dashboard.jsx`; add overdue/expiry widgets.

4. **Improve AI recommendations.**  
   Backend: use sales frequency, farmer crop/soil/season, stock availability, margin, expiry urgency.  
   Frontend: add "add to sale" actions and feedback capture from `RecommendationsDashboard.jsx` and `FarmerRecommendations.jsx`.

5. **WhatsApp management UI.**  
   Frontend: settings/logs/catalog upload pages using existing routes in `whatsAppRoutes.js`.  
   Backend: encrypt/store sensitive WhatsApp tokens; validate webhook token configuration.

## Low Priority Implementation Plan

1. Batch/lot-level inventory with expiry per purchase lot.
2. Advanced reporting: profit/margin, supplier performance, farmer credit ledger, tax/GST.
3. Background job dashboard and notification inbox.
4. Code splitting to reduce the current 1 MB frontend JS bundle warning.
5. Automated tests: unit tests for stock service; integration tests for purchase/sale transactions.

## Production Readiness Checklist

- Require `JWT_SECRET`, `MONGO_URI`, `CLIENT_URL`, SMTP and WhatsApp credentials in production; remove unsafe defaults.
- Replace `xss-clean` if compatibility issues appear with modern Express/Mongoose; keep sanitization/validation explicit.
- Add centralized request validation with Joi/Zod/express-validator.
- Add Mongo indexes: `Sale.saleDate`, `Sale.customer`, `Sale.paymentStatus`, `Purchase.purchaseDate`, `Purchase.supplier`, `Stock.quantity`, `Product.name/category/supplier/deletedAt`, `StockMovement.createdAt/type`.
- Replace `countDocuments() + 1` invoice numbering with an atomic counter collection.
- Add backups, log rotation, health checks, and deployment `.env.example`.
- Add transaction/session support around product+stock create/update flows.
- Add API pagination/search consistently to sales, farmers, suppliers, categories, users.

## Recommended Implementation Order

1. Fix date-field UI bugs and frontend export mocks.
2. Create stock movement service and migrate sale/manual/disposal flows to it.
3. Persist sale invoices and expose invoice download APIs.
4. Add sales payment status, due date, amount due, and reminder generation.
5. Rebuild stock reports from movements.
6. Persist store settings and wire PDFs to settings.
7. Add role guards and production env hardening.
8. Expand dashboard widgets and recommendation UX.
9. Add automated tests around inventory and invoices.
10. Optimize bundle splitting and polish responsive/table states.

## Estimated Effort

High-priority data integrity and invoice work: **5-7 focused development days**.  
Medium-priority analytics/settings/security polish: **4-6 days**.  
Low-priority advanced reporting/AI/performance/testing depth: **1-2 weeks**, depending on scope.

