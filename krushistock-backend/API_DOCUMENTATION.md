# KrushiStock API Documentation

Base URL: `http://localhost:5000/api`

## Authentication

### Login
**POST** `/auth/login`

Request:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "username": "admin",
    "email": "admin@krushistock.com",
    "role": "admin"
  }
}
```

### Get Current User
**GET** `/auth/me`

Headers: `Authorization: Bearer <token>`

Response:
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Admin User",
    "username": "admin",
    "role": "admin"
  }
}
```

## Categories

### Get All Categories
**GET** `/categories`

Response:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Seeds",
      "description": "Agricultural seeds",
      "productCount": 15,
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Category
**POST** `/categories`

Request:
```json
{
  "name": "Fertilizers",
  "description": "Organic and chemical fertilizers"
}
```

## Products

### Get All Products
**GET** `/products`

Response:
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "NPK Fertilizer",
      "category": {
        "_id": "507f...",
        "name": "Fertilizers"
      },
      "supplier": {
        "_id": "507f...",
        "name": "ABC Suppliers",
        "phone": "9876543210"
      },
      "unit": "kg",
      "price": 450,
      "reorderLevel": 20,
      "stock": 120,
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

### Create Product
**POST** `/products`

Request:
```json
{
  "name": "Wheat Seeds",
  "category": "507f1f77bcf86cd799439011",
  "supplier": "507f1f77bcf86cd799439012",
  "unit": "kg",
  "price": 250,
  "stock": 50,
  "reorderLevel": 10,
  "description": "Premium quality wheat seeds"
}
```

### Update Product
**PUT** `/products/:id`

Request:
```json
{
  "price": 275,
  "reorderLevel": 15
}
```

## Stock Management

### Get Stock Overview
**GET** `/stock/overview`

Response:
```json
{
  "success": true,
  "count": 25,
  "data": {
    "items": [
      {
        "_id": "507f...",
        "product": {
          "_id": "507f...",
          "name": "NPK Fertilizer",
          "category": { "name": "Fertilizers" }
        },
        "quantity": 120,
        "unit": "kg",
        "price": 450,
        "value": 54000,
        "reorderLevel": 20
      }
    ],
    "summary": {
      "totalValue": 156000,
      "totalItems": 25,
      "lowStockItems": 3
    }
  }
}
```

### Get Low Stock Items
**GET** `/stock/low-stock`

Response:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "507f...",
      "product": {
        "name": "Wheat Seeds",
        "category": { "name": "Seeds" }
      },
      "currentStock": 8,
      "reorderLevel": 10,
      "unit": "kg",
      "supplier": {
        "name": "XYZ Seeds Co",
        "phone": "9876543211"
      }
    }
  ]
}
```

## Purchases

### Create Purchase (Auto Increases Stock)
**POST** `/purchases`

Request:
```json
{
  "supplier": "507f1f77bcf86cd799439011",
  "purchaseDate": "2026-02-10",
  "items": [
    {
      "product": "507f1f77bcf86cd799439012",
      "quantity": 50,
      "price": 450
    },
    {
      "product": "507f1f77bcf86cd799439013",
      "quantity": 30,
      "price": 250
    }
  ],
  "totalAmount": 30000,
  "paymentMethod": "Cash",
  "paymentStatus": "Paid"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "purchaseNumber": "PUR-0001",
    "supplier": "507f...",
    "items": [...],
    "totalAmount": 30000,
    "purchaseDate": "2026-02-10T00:00:00.000Z",
    "paymentStatus": "Paid"
  }
}
```

**Note**: Stock is automatically increased for all items in the purchase.

## Sales

### Create Sale (Auto Decreases Stock)
**POST** `/sales`

Request:
```json
{
  "customer": "507f1f77bcf86cd799439011",
  "saleDate": "2026-02-12",
  "items": [
    {
      "product": "507f1f77bcf86cd799439012",
      "quantity": 10,
      "price": 500
    }
  ],
  "totalAmount": 5000,
  "paymentMethod": "UPI"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "_id": "507f...",
    "saleNumber": "SAL-0001",
    "customer": "507f...",
    "items": [...],
    "totalAmount": 5000,
    "saleDate": "2026-02-12T00:00:00.000Z",
    "paymentMethod": "UPI"
  }
}
```

**Note**: 
- Stock is checked before sale creation
- Sale is rejected if insufficient stock
- Stock is automatically decreased after successful sale

## Farmers

### Get All Farmers
**GET** `/farmers`

Response:
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "507f...",
      "name": "Ramesh Patil",
      "phone": "9876543210",
      "village": "Shirur",
      "district": "Pune",
      "landSize": "5 acres",
      "totalPurchases": 45000,
      "createdAt": "2026-01-10T00:00:00.000Z"
    }
  ]
}
```

### Create Farmer
**POST** `/farmers`

Request:
```json
{
  "name": "Suresh Kumar",
  "phone": "9876543211",
  "email": "suresh@example.com",
  "village": "Khed",
  "district": "Pune",
  "landSize": "3 acres",
  "crops": "Wheat, Rice"
}
```

## Reports

### Dashboard Statistics
**GET** `/dashboard/stats`

Response:
```json
{
  "success": true,
  "data": {
    "totalProducts": 156,
    "totalStock": 1250000,
    "todaySales": 25000,
    "lowStockCount": 8
  }
}
```

### Stock Report
**GET** `/stock/report?startDate=2026-01-01&endDate=2026-02-12&category=507f...`

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product": "NPK Fertilizer",
        "category": "Fertilizers",
        "openingStock": 100,
        "purchases": 50,
        "sales": 30,
        "closingStock": 120,
        "value": 54000
      }
    ],
    "summary": {
      "totalValue": 156000,
      "totalQuantity": 450
    }
  }
}
```

### Sales Report
**GET** `/sales/report?startDate=2026-01-01&endDate=2026-02-12`

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "date": "2026-02-12T00:00:00.000Z",
        "saleNumber": "SAL-0001",
        "customer": "Ramesh Patil",
        "items": 2,
        "quantity": 15,
        "amount": 5000,
        "paymentMethod": "Cash"
      }
    ],
    "summary": {
      "totalSales": 125000,
      "totalTransactions": 45,
      "averageTransaction": 2777.78
    }
  }
}
```

### Purchase Report
**GET** `/purchases/report?startDate=2026-01-01&endDate=2026-02-12`

Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "date": "2026-02-01T00:00:00.000Z",
        "purchaseNumber": "PUR-0001",
        "supplier": "ABC Suppliers",
        "items": 2,
        "quantity": 80,
        "amount": 30000,
        "paymentStatus": "Paid"
      }
    ],
    "summary": {
      "totalPurchases": 450000,
      "totalTransactions": 35,
      "pendingPayments": 50000
    }
  }
}
```

## Users

### Get All Users
**GET** `/users`

Response:
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "507f...",
      "name": "Admin User",
      "username": "admin",
      "email": "admin@krushistock.com",
      "role": "admin",
      "phone": "9876543210",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### Create User (Admin Only)
**POST** `/users`

Request:
```json
{
  "name": "Staff Member",
  "username": "staff1",
  "email": "staff@krushistock.com",
  "password": "password123",
  "phone": "9876543211",
  "role": "staff"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Insufficient stock for product. Available: 5, Requested: 10"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized, no token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Product not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

## WhatsApp Business API Integration

All routes except Webhook and Simulator require a JWT token in the Authorization header.

### 1. Webhook Verification (Meta API challenge)
**GET** `/v1/whatsapp/webhook`

Query Parameters:
- `hub.mode`: `subscribe`
- `hub.verify_token`: Verification token configured in settings
- `hub.challenge`: Random challenge string sent by Meta

Response:
- Returns the challenge string to verify webhook authenticity.

---

### 2. Webhook Event Ingestion
**POST** `/v1/whatsapp/webhook`

Processes status updates (`sent`, `delivered`, `read`, `failed`) and incoming messages from Meta.

---

### 3. Webhook simulation (Developer testing)
**POST** `/v1/whatsapp/webhook/simulate-receive`

Allows you to trigger mock incoming messages or status changes locally.

Request (Incoming Message):
```json
{
  "eventType": "incoming_message",
  "phone": "919876543210",
  "text": "Hello, is Urea Premium in stock?"
}
```

Request (Message Status Update):
```json
{
  "eventType": "status_update",
  "messageId": "wamid.doc.72r611g2pyy",
  "status": "read"
}
```

---

### 4. Fetch/Update WhatsApp Configuration
**GET** `/v1/whatsapp/settings`  
**PUT** `/v1/whatsapp/settings`

Allows administrators/staff to view or change API credentials, alert phone numbers, and features.

PUT Request:
```json
{
  "accessToken": "EAA...",
  "phoneNumberId": "123456789...",
  "businessAccountId": "987654321...",
  "webhookVerifyToken": "my_custom_token",
  "adminPhoneNumber": "919876543210",
  "lowStockAlertsEnabled": true,
  "paymentRemindersEnabled": true,
  "catalogSharingEnabled": true,
  "lowStockThreshold": 15
}
```

---

### 5. Fetch Message History Logs
**GET** `/v1/whatsapp/logs`

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Logs per page (default: 20)
- `status`: Filter by status (`sent`, `received`, `failed`, `delivered`, `read`)
- `type`: Filter by direction (`sent`, `received`)
- `phone`: Filter by recipient/sender number

Response:
```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "total": 12,
    "page": 1,
    "pages": 1
  },
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "whatsappMessageId": "wamid.doc.72r611g2pyy",
      "type": "sent",
      "from": "System",
      "to": "919876543210",
      "messageType": "document",
      "status": "sent",
      "content": {
        "mediaId": "media_yyh1x5dlrz",
        "caption": "Invoice SAL-TEST-9005",
        "filename": "invoice-SAL-TEST-9005.pdf"
      },
      "statusHistory": [
        { "status": "sent", "timestamp": "2026-05-22T23:58:00.000Z" }
      ],
      "timestamp": "2026-05-22T23:58:00.000Z"
    }
  ]
}
```

---

### 6. Retry Failed Message
**POST** `/v1/whatsapp/logs/:id/retry`

Retries sending a previously failed message.

---

### 7. Share Product Catalog Details
**POST** `/v1/whatsapp/products/:id/share`

Shares a text representation of product details (name, price, stock availability, description, image) via WhatsApp.

Request:
```json
{
  "phone": "919876543210"
}
```

---

### 8. Upload Product Image for Catalog Sharing
**POST** `/v1/whatsapp/products/:id/image`

Uploads an image file (multipart/form-data) to serve as the catalog illustration.

---

### 9. Manually Trigger Farmer Payment Reminder
**POST** `/v1/whatsapp/reminders/:id/send`

Manually dispatches a WhatsApp payment reminder to the farmer associated with a pending credit sale.

---

## Notes

1. All routes except `/auth/login`, `/v1/whatsapp/webhook`, and `/v1/whatsapp/webhook/simulate-receive` require authentication.
2. Include JWT token in Authorization header: `Bearer <token>`
3. Dates should be in ISO 8601 format.
4. Stock is automatically managed on purchases and sales.
5. Low stock threshold can be configured per product.
6. If credentials in Settings are not configured, WhatsApp services automatically run in **Mock Mode** (logging outputs locally and to the server console instead of executing external API requests).

