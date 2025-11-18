# Sarasota Automotive Website

A modern, full-featured website for Sarasota Automotive with inventory management, rental car system, and admin dashboard. Features a sleek glassmorphism UI design with responsive layout and comprehensive car management system.

## Features

### Public-Facing Features
- **Fullscreen Home Page**: Beautiful fullscreen hero section with cityscape background
- **Services Page**: Showcase of automotive services with hero section and service cards
- **Cars for Sale**: Public inventory display with detailed car information
- **Cars for Rent**: Rental car inventory with client inquiry form
- **Contact Page**: Contact form for customer inquiries
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Modern UI**: Glassmorphism design with transparent panels and backdrop blur effects
- **Sticky Header**: Transparent header with gradient overlay that stays visible while scrolling
- **Sidebar Navigation**: Slide-out menu that stays open for easy navigation

### Admin Features
- **Admin Dashboard**: Complete admin area for managing inventory and rental requests
- **Car Management**: Add, edit, delete cars with detailed information
  - Support for multiple images per car
  - Detailed fields: brand, model, mileage, gearbox, fuel type, power, price, etc.
  - Separate management for sale and rental cars
- **Brand & Model Management**: Dynamic brand and model management system
  - Add new brands and models through admin interface
  - Dropdowns automatically populate with database entries
- **Image Upload**: Multiple image uploads with preview functionality
- **Rental Request Management**: View and manage rental inquiries
- **Email Notifications**: Automated emails sent to car owners when rental inquiries are submitted

## Tech Stack

- **Backend**: Node.js with Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **File Upload**: Multer for handling image uploads
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Modern CSS with CSS Variables, Flexbox, and Glassmorphism effects

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
├── models/           # Database models
│   ├── User.js       # Admin user model
│   ├── Car.js        # Car inventory model
│   ├── Brand.js      # Car brand model
│   ├── Model.js      # Car model model
│   └── RentalRequest.js  # Rental inquiry model
├── routes/           # API routes
│   ├── auth.js       # Authentication routes
│   ├── cars.js       # Car CRUD operations
│   ├── brands.js     # Brand and model management
│   ├── upload.js     # Image upload handling
│   ├── rentals.js    # Rental inquiry routes
│   ├── admin.js      # Admin dashboard routes
│   └── feeds.js      # Feed generation
├── middleware/       # Express middleware
│   └── auth.js       # JWT authentication middleware
├── services/         # Business logic services
│   └── marketingFlow.js  # Marketing automation
├── public/           # Frontend files
│   ├── index.html    # Main HTML file
│   ├── styles.css    # All CSS styles
│   ├── app.js        # Client-side JavaScript
│   ├── logo.avif     # Site logo
│   └── uploads/      # Uploaded images directory
├── server.js         # Main server file
├── init-admin.js     # Admin user initialization script
└── package.json      # Dependencies
```

## API Endpoints

### Public Endpoints
- `GET /api/cars/sale` - Get all cars for sale
- `GET /api/cars/rent` - Get all cars for rent
- `GET /api/cars/:id` - Get single car details
- `GET /api/brands` - Get all car brands
- `GET /api/brands/:brandName/models` - Get models for a specific brand
- `POST /api/rentals/inquiry` - Submit rental inquiry

### Admin Endpoints (Require Authentication)
- `POST /api/auth/login` - Admin login
- `POST /api/auth/init-admin` - Initialize admin user (first time setup)

**Car Management:**
- `POST /api/cars` - Add new car
- `PUT /api/cars/:id` - Update car
- `DELETE /api/cars/:id` - Delete car
- `PATCH /api/cars/:id/sold` - Mark car as sold

**Brand & Model Management:**
- `POST /api/brands` - Add new brand
- `POST /api/brands/:brandName/models` - Add new model for a brand

**File Upload:**
- `POST /api/upload/images` - Upload multiple car images (max 10 files, 10MB each)

**Admin Dashboard:**
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/rental-requests` - Get all rental requests
- `PATCH /api/admin/rental-requests/:id/status` - Update request status

## Features in Detail

### Car Management System
**For Sale Cars:**
- Brand, Model, Model Version
- Mileage, First Registration Date
- Gearbox Type (Manual/Automatic)
- Fuel Type (Petrol/Diesel/Electric/Hybrid)
- Power (HP)
- Price
- Vehicle Options (checkboxes)
- Multiple images

**For Rent Cars:**
- Brand, Model
- Gearbox Type, Fuel Type
- Number of Persons
- Daily Rate
- Owner Email
- Vehicle Options
- Multiple images

### Brand & Model Management
- Dynamic brand and model dropdowns
- Add new brands and models through admin interface
- Brands and models are stored in separate collections
- Models are linked to brands with compound unique indexes
- Supports adding brands/models on-the-fly when creating cars

### Image Upload System
- Multiple image uploads per car (up to 10 images)
- Image preview before submission
- Supported formats: JPEG, JPG, PNG, GIF, WebP, AVIF
- Maximum file size: 10MB per image
- Images stored in `public/uploads/` directory
- Unique filenames to prevent conflicts

### Admin Dashboard
- View statistics (total cars, sold cars, pending requests)
- Manage cars for sale (add, edit, delete, mark as sold)
- Manage rental cars (add, edit, delete)
- View and manage rental inquiries
- Update rental request status
- Add brands and models dynamically

### Rental System
- Clients can view available rental cars with full details
- Submit inquiry form with rental dates and message
- Automatic email notification to car owner
- Request saved in admin dashboard for tracking
- Admin can update request status (pending/contacted/completed)

### UI/UX Features
- **Glassmorphism Design**: Transparent panels with backdrop blur effects
- **Sticky Header**: Transparent gradient header that stays visible while scrolling
- **Responsive Sidebar**: Slide-out menu that stays open for navigation
- **URL Hash Routing**: Page state persists on refresh using URL hashes
- **Smooth Animations**: 300ms transitions for menu and content shifts
- **Accessibility**: ARIA attributes, focus trap, keyboard navigation support

## Email Configuration

To enable email notifications, configure SMTP settings in `.env`:

- For Gmail: Use an App Password (not your regular password)
  1. Enable 2-Step Verification in your Google Account
  2. Generate an App Password: https://myaccount.google.com/apppasswords
  3. Use the generated password in `SMTP_PASS`
- For other providers: Adjust `SMTP_HOST` and `SMTP_PORT` accordingly

## Image Upload Configuration

- Images are stored in `public/uploads/` directory
- Make sure the directory has write permissions
- The directory is automatically created if it doesn't exist
- Maximum file size: 10MB per image
- Maximum files per upload: 10 images

## Database Models

### Car Model
- Supports both sale and rental cars
- Fields include: brand, model, mileage, gearbox, fuelType, price, dailyRate, images (array)
- Legacy fields (make, image) supported for backward compatibility

### Brand Model
- Simple model with unique name field
- Used for dropdown population

### Model Model
- Linked to Brand with compound unique index
- Used for model dropdown population

## Development Notes

### CSS Architecture
- Uses CSS Variables for consistent theming (`--menu-width`, `--container-max`, etc.)
- Viewport wrapper approach for responsive layout
- Content box width remains constant when menu opens/closes
- Glassmorphism effects using `backdrop-filter` and RGBA backgrounds

### Client-Side Routing
- Uses URL hash fragments (`#home`, `#services`, etc.) for page navigation
- Page state persists on refresh
- Active menu item is highlighted based on current page

### Form Validation
- Custom client-side validation
- Dynamic required field management based on car type
- Error messages displayed in form modal
- Image preview before upload

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `sudo systemctl status mongod`
- Check connection string in `.env` file
- See `QUICK_START.md` for MongoDB installation instructions

### Image Upload Issues
- Check that `public/uploads/` directory exists and has write permissions
- Verify file size (max 10MB) and format (images only)
- Check server logs for multer errors

### Admin Login Issues
- Ensure admin user is initialized: `npm run init-admin`
- Check JWT_SECRET is set in `.env`
- Verify token expiration settings

### Page Not Persisting on Refresh
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check browser console for JavaScript errors
- Verify URL hash is being set correctly

## License

ISC

