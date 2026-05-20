# KrushiStock Backend

Complete Node.js + Express + MongoDB backend for KrushiStock Inventory Management System.

## Features

- 🔐 JWT Authentication
- 📦 Product Management
- 🏭 Supplier Management
- 📊 Stock Management (Auto Update)
- 🛒 Purchase Management (Auto Stock Increase)
- 💰 Sales Management (Auto Stock Decrease)
- 👨‍🌾 Farmer/Customer Management
- 📈 Reports & Analytics
- 🔒 Protected Routes with Role-Based Access

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **CORS**: Enabled for frontend integration

## Installation

1. Clone the repository:
```bash
cd krushistock-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/krushistock
JWT_SECRET=krushistock_secret_key
JWT_EXPIRE=7d
```

4. Make sure MongoDB is running:
```bash
# On Mac/Linux
mongod

# On Windows
net start MongoDB
```

5. Start the server:
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:5000`

## Initial Setup

### Create Admin User

Connect to MongoDB and create an admin user manually:

```javascript
use krushistock

db.users.insertOne({
  name: "Admin User",
  username: "admin",
  email: "admin@krushistock.com",
  password: "$2a$10$X9kF5qQZ5nQ5kZ5kZ5kZ5u5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5kZ5", // admin123
  role: "admin",
  createdAt: new Date()
})
```

Or use bcrypt to hash your own password:
```javascript
const bcrypt = require('bcryptjs');
const password = await bcrypt.hash('yourpassword', 10);
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login (Public)
- `GET /api/auth/me` - Get current user (Protected)
- `GET /api/users` - Get all users (Protected)
- `POST /api/users` - Create user (Protected - Admin only)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get single category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Products
- `GET /api/products` - Get all products with stock
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get single product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create supplier
- `GET /api/suppliers/:id` - Get single supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Stock
- `GET /api/stock/overview` - Get all stock with details
- `GET /api/stock/low-stock` - Get low stock items
- `PUT /api/stock/update` - Manual stock update

### Purchases
- `GET /api/purchases` - Get all purchases
- `POST /api/purchases` - Create purchase (Auto increases stock)
- `GET /api/purchases/:id` - Get single purchase
- `PUT /api/purchases/:id` - Update purchase
- `DELETE /api/purchases/:id` - Delete purchase

### Sales
- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale (Auto decreases stock)
- `GET /api/sales/:id` - Get single sale
- `PUT /api/sales/:id` - Update sale
- `DELETE /api/sales/:id` - Delete sale

### Farmers
- `GET /api/farmers` - Get all farmers
- `POST /api/farmers` - Create farmer

### Reports
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/stock/report` - Get stock report
- `GET /api/sales/report` - Get sales report
- `GET /api/purchases/report` - Get purchase report

## Business Logic

### Automatic Stock Management

**Purchase Creation:**
1. When a purchase is created, stock automatically increases
2. If stock entry doesn't exist for product, it's created automatically
3. Multiple items in a single purchase are handled correctly

**Sale Creation:**
1. Stock availability is checked before creating sale
2. If insufficient stock, sale is rejected with error
3. Stock automatically decreases after successful sale
4. Multiple items in a single sale are handled correctly

### Low Stock Alerts

Products are flagged as low stock when:
- `currentStock <= lowStockLimit`
- Default low stock limit is 10 units

## Authentication

All routes except `/api/auth/login` are protected and require:

```
Authorization: Bearer <JWT_TOKEN>
```

### Login Example

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Admin User",
    "username": "admin",
    "role": "admin"
  }
}
```

## Error Handling

The API uses standard HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

Error Response Format:
```json
{
  "success": false,
  "message": "Error description"
}
```

## Database Models

### User
- name, username, email, password, role, phone

### Category
- name, description

### Product
- name, category, supplier, unit, price, reorderLevel, description

### Supplier
- name, contact, phone, email, address, gst

### Stock
- product, quantity, lowStockLimit

### Purchase
- purchaseNumber, supplier, items[], totalAmount, purchaseDate, paymentMethod, paymentStatus

### Sale
- saleNumber, customer, items[], totalAmount, saleDate, paymentMethod

### Farmer
- name, phone, email, village, district, landSize, crops

## Project Structure

```
krushistock-backend/
├── src/
│   ├── config/         # Database and environment config
│   ├── models/         # Mongoose models
│   ├── controllers/    # Request handlers
│   ├── routes/         # API routes
│   ├── middleware/     # Auth and error middleware
│   ├── utils/          # Helper functions
│   └── server.js       # Main application file
├── .env                # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## Testing

Test the API using:
- Postman
- cURL
- Thunder Client (VS Code extension)
- Frontend application

## Deployment

For production deployment:

1. Set production environment variables
2. Use a MongoDB cloud service (MongoDB Atlas)
3. Deploy to services like:
   - Heroku
   - DigitalOcean
   - AWS
   - Azure

## Support

For issues or questions, please check the code comments or contact the development team.

## License

MIT
