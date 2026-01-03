# Electronics Shop Management System

A modern, comprehensive Point of Sale (POS) and Inventory Management System designed specifically for electronics retail and repair shops. Built with **React 19**, **TypeScript**, and **Vite**, this application offers a high-performance, responsive interface for managing all aspects of your business.

![Project Status](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 Features

### 🛒 Point of Sale (POS) & Billing

- **Fast Checkout**: Streamlined billing interface for quick transactions.
- **Discount Management**: Apply custom discounts to items or totals.
- **Tax Calculation**: Automated tax handling.
- **Invoice Generation**: Professional invoice creation and history.
- **Loyalty System**: Track customer visits and award loyalty points on purchases.

### 📦 Inventory & Stock Management

- **Real-time Tracking**: Monitor stock levels across all products.
- **Low Stock Alerts**: Visual indicators for items running low.
- **Product Organization**: Categorize products with ease.
- **Buying & Selling Prices**: Clear visibility on margins.

### 🔧 Repair Management

- **Service Tracking**: Manage repair jobs from intake to completion.
- **Status Updates**: Track repair progress (Pending, In Progress, Completed).

### 👥 Customer & Supplier Management

- **Customer CRM**: Detailed customer profiles with purchase history.
- **Supplier Database**: Manage supplier contact details and supply history.

### 📊 Dashboard & Analytics

- **Financial Overview**: Visual charts for revenue, expenses, and profit.
- **Reports**: Detailed reports for data-driven decision making.
- **Accounting**: Basic financial tracking and ledger.

## 🛠️ Tech Stack

This project uses the latest modern web technologies for performance and scalability:

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Utilities**: `date-fns`, `uuid`, `clsx`

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/electronics-shop-management.git
   cd electronics-shop-management
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server** This command concurrently starts the Vite frontend and the mock JSON server backend.

   ```bash
   npm run dev
   ```

4. **Access the application** Open your browser and navigate to `http://localhost:5173`.

## 📜 Scripts

- `npm run dev`: Starts both the frontend and the mock backend server.
- `npm run build`: Type-checks and builds the project for production.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run db`: Starts the JSON server independently (mock database).

## 📂 Project Structure

```
src/
├── components/   # Reusable UI components
├── pages/        # Main application pages (Billing, Inventory, etc.)
├── stores/       # Global state management (Zustand stores)
├── layouts/      # Layout wrappers
├── types/        # TypeScript type definitions
├── utils/        # Helper functions
├── data/         # Mock data (db.json)
└── App.tsx       # Main application entry
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
