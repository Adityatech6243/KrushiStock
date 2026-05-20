# KrushiStock - Inventory Management System

A complete MERN stack inventory management system designed for Krushi Seva Kendra.

## Features

- 🔐 **Authentication** - Login system with JWT token-based authentication
- 📊 **Dashboard** - Overview of key metrics and statistics
- 📦 **Product Management** - Add, edit, and manage products
- 🏭 **Supplier Management** - Maintain supplier database
- 📈 **Stock Management** - Track inventory levels and low stock alerts
- 🛒 **Purchase Management** - Record purchase transactions
- 💰 **Sales Management** - Process and track sales
- 👨‍🌾 **Farmer/Customer Management** - Manage customer database
- 📑 **Reports** - Generate stock, sales, and purchase reports
- 👥 **User Management** - Admin and staff user management
- ⚙️ **Settings** - Configure system preferences

## Tech Stack

- **Frontend**: React 18, Vite
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Charts**: Recharts

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd krushistock-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
krushistock-frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/          # Reusable UI components
│   │   ├── layout/          # Layout components
│   │   └── charts/          # Chart components
│   ├── pages/               # All page components
│   ├── services/            # API service files
│   ├── utils/               # Utility functions
│   ├── App.jsx
│   ├── main.jsx
│   └── routes.jsx
├── package.json
└── README.md
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Default Login Credentials

**Note:** These are dummy credentials. Update them after backend integration.

- Username: admin
- Password: admin123

## API Configuration

The application is configured to use `http://localhost:5000/api` as the API base URL.

Update the API base URL in `src/utils/constants.js` if your backend is hosted elsewhere.

## Features Breakdown

### Dashboard
- Total products count
- Total stock value
- Today's sales
- Low stock alerts
- Stock and sales charts

### Products
- Product listing with search/filter
- Add new products
- Edit existing products
- Category-wise organization
- Stock quantity tracking

### Stock Management
- Real-time stock overview
- Low stock alerts
- Stock valuation reports

### Sales & Purchases
- Record sales transactions
- Track purchase history
- Automatic stock updates
- Payment tracking

### Reports
- Stock movement reports
- Sales performance reports
- Purchase analysis reports
- Export functionality (Print/Excel)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, email support@krushistock.com

## Acknowledgments

- Built for Krushi Seva Kendra
- Designed for agricultural retail inventory management
