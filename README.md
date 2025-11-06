# Sarasota Automotive Website

A modern, full-featured website for Sarasota Automotive with inventory management, rental car system, and admin dashboard.

## Features

- **Fullscreen Home Page**: Beautiful fullscreen hero section with cityscape background
- **Cars for Sale**: Public inventory display with admin management
- **Cars for Rent**: Rental car inventory with client inquiry form
- **Admin Dashboard**: Complete admin area for managing inventory and rental requests
- **Email Notifications**: Automated emails sent to car owners when rental inquiries are submitted
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/sarasota_automotive
   JWT_SECRET=your_secret_key_here
   ADMIN_EMAIL=admin@sarasotaautomotive.com
   ADMIN_PASSWORD=admin123
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   NODE_ENV=development
   ```

4. Make sure MongoDB is running on your system

5. Initialize the admin user (run once):
   ```bash
   curl -X POST http://localhost:3000/api/auth/init-admin \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

6. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

7. Open your browser and navigate to `http://localhost:3000`

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

**Important**: Change these credentials after first login!

## Project Structure

```
sarasotaautomotive/
├── models/           # Database models (User, Car, RentalRequest)
├── routes/           # API routes (auth, cars, rentals, admin)
├── middleware/       # Authentication middleware
├── public/           # Frontend files
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js         # Main server file
└── package.json      # Dependencies
```

## API Endpoints

### Public Endpoints
- `GET /api/cars/sale` - Get all cars for sale
- `GET /api/cars/rent` - Get all cars for rent
- `GET /api/cars/:id` - Get single car details
- `POST /api/rentals/inquiry` - Submit rental inquiry

### Admin Endpoints (Require Authentication)
- `POST /api/auth/login` - Admin login
- `POST /api/cars` - Add new car
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car
- `PATCH /api/cars/:id/sold` - Mark car as sold
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/rental-requests` - Get all rental requests
- `PATCH /api/admin/rental-requests/:id/status` - Update request status

## Features in Detail

### Admin Dashboard
- View statistics (total cars, sold cars, pending requests)
- Manage cars for sale (add, edit, delete, mark as sold)
- Manage rental cars (add, edit, delete)
- View and manage rental inquiries
- Update rental request status

### Rental System
- Clients can view available rental cars
- Submit inquiry form with dates and message
- Automatic email notification to car owner
- Request saved in admin dashboard for tracking

## Email Configuration

To enable email notifications, configure SMTP settings in `.env`:

- For Gmail: Use an App Password (not your regular password)
- For other providers: Adjust SMTP_HOST and SMTP_PORT accordingly

## License

ISC

