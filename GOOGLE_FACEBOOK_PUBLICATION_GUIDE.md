# Google & Facebook Publication Guide

## How It Works: Overview

When you create a new car in the admin dashboard, the system automatically makes it available for Google Vehicle Ads and Facebook Marketplace through **feed-based publication**. Here's how it works:

---

## Current Implementation (Feed-Based Approach)

### Step-by-Step Flow

1. **Admin Creates a Car**
   - Admin adds a new car via the dashboard (`POST /api/cars`)
   - Car is saved to MongoDB
   - System triggers `marketingFlow.onCarCreated()` (fire-and-forget)

2. **Feed Endpoints Are Generated**
   - Your server exposes two public feed URLs:
     - **Google**: `https://yourdomain.com/feeds/google-vehicles.json`
     - **Facebook**: `https://yourdomain.com/feeds/meta-vehicles.csv`
   - These endpoints query your database and return all available cars in the required format

3. **Platforms Fetch the Feed**
   - Google Merchant Center and Facebook Commerce Manager are configured to fetch these feeds on a schedule (e.g., every hour or daily)
   - They download the feed, parse it, and update their catalogs

4. **Cars Appear in Ads/Marketplace**
   - Google: Vehicles appear in Vehicle Ads on Google Search, Maps, and Shopping
   - Facebook: Vehicles appear in Marketplace (if eligible) and can be used for Auto Inventory Ads

---

## How Google Vehicle Ads Works

### Setup Process

1. **Create Google Merchant Center Account**
   - Go to [merchant.google.com](https://merchant.google.com)
   - Verify your business and website
   - Link your Google Ads account (if you want to run ads)

2. **Create a Vehicle Feed**
   - In Merchant Center, go to **Products** → **Feeds**
   - Create a new feed with type **"Vehicles"**
   - Choose **"Scheduled fetch"** as the fetch method
   - Enter your feed URL: `https://yourdomain.com/feeds/google-vehicles.json`
   - Set schedule (e.g., hourly or daily)

3. **Feed Format Requirements**
   - Google expects specific fields in JSON format
   - Our feed provides:
     - `id`, `title`, `description`, `image_link`
     - `price`, `mileage`, `condition`
     - `make`, `model`, `year`
     - `availability` (in_stock/out_of_stock)
     - `link` (URL to car detail page)

4. **Google Processes the Feed**
   - Google fetches the feed on schedule
   - Validates data (images, prices, required fields)
   - Adds/updates vehicles in your catalog
   - Makes them available for Vehicle Ads campaigns

5. **Create Vehicle Ads Campaign**
   - In Google Ads, create a campaign type **"Vehicle Ads"**
   - Link it to your Merchant Center catalog
   - Set budget and targeting
   - Google automatically creates ads for each vehicle

### Important Notes

- **Feed Updates**: Google typically processes feeds within 1-24 hours
- **Validation**: Google validates images, prices, and required fields. Invalid items are rejected
- **Availability**: Only cars with `status: 'available'` are included in the feed
- **Manual Review**: First-time feeds may require manual approval (1-3 business days)

---

## How Facebook Marketplace Works

### Setup Process

1. **Create Meta Business Account**
   - Go to [business.facebook.com](https://business.facebook.com)
   - Create or connect your Facebook Page
   - Set up Commerce Manager

2. **Create Vehicle Catalog**
   - In Commerce Manager, go to **Catalog** → **Create Catalog**
   - Choose **"E-commerce"** or **"Vehicles"** (if available)
   - Select **"Data Feed"** as the data source

3. **Configure Data Feed**
   - Add a data source: **"Upload data file"** or **"Scheduled feed"**
   - Enter feed URL: `https://yourdomain.com/feeds/meta-vehicles.csv`
   - Set schedule (e.g., daily at 2 AM)
   - Map CSV columns to Facebook's required fields

4. **Required Fields for Facebook**
   - `id` (unique identifier)
   - `title`, `description`, `image_link`
   - `price`, `availability`
   - `make`, `model`, `year`, `mileage`
   - `link` (URL to car detail page)

5. **Facebook Processes the Feed**
   - Facebook fetches the CSV feed on schedule
   - Validates and imports vehicles
   - Makes them available for:
     - **Marketplace** (if your business is eligible)
     - **Auto Inventory Ads** (advertising campaigns)

### Important Notes

- **Marketplace Eligibility**: Not all businesses can list on Marketplace. Facebook reviews eligibility based on:
  - Business type and location
  - Compliance with Facebook policies
  - Account history and verification
- **Feed Format**: Facebook prefers CSV for vehicle catalogs
- **Update Frequency**: Facebook processes feeds daily; changes may take 24-48 hours to appear
- **Manual Review**: New catalogs may require approval (3-7 business days)

---

## Feed-Based vs API-Based Approach

### Current Implementation: Feed-Based ✅

**How it works:**
- Your server exposes feed URLs (JSON/CSV)
- Platforms fetch feeds on a schedule
- No real-time updates (depends on fetch schedule)

**Pros:**
- Simple to implement
- No API authentication complexity
- Works with scheduled fetches
- Lower risk of rate limiting

**Cons:**
- Not instant (depends on fetch schedule)
- Platforms control when they fetch
- Less control over individual item updates

### Alternative: API-Based (Future Enhancement)

**How it would work:**
- Use Google Merchant Center API to push individual items
- Use Facebook Graph API to create/update catalog items
- Real-time updates when car is created

**Pros:**
- Instant publication
- More control over individual items
- Can handle updates/deletes immediately

**Cons:**
- More complex (OAuth, API keys, rate limits)
- Requires platform-specific API implementations
- Higher risk of errors/rate limiting

---

## Current Code Flow

### When Admin Creates a Car

```javascript
// routes/cars.js - POST /api/cars
router.post('/', auth, async (req, res) => {
  const car = new Car(req.body);
  await car.save();
  
  // Trigger marketing flow (fire-and-forget)
  marketingFlow.onCarCreated(car);
  
  res.status(201).json(car);
});
```

### Marketing Flow Service

```javascript
// services/marketingFlow.js
async function onCarCreated(car) {
  // Currently: Just ping feed endpoints to warm cache
  // Future: Could trigger API calls or queue jobs
  const base = process.env.PUBLIC_BASE_URL;
  axios.get(`${base}/feeds/google-vehicles.json`);
  axios.get(`${base}/feeds/meta-vehicles.csv`);
}
```

### Feed Endpoints

```javascript
// routes/feeds.js

// Google feed: Returns JSON with all available cars
GET /feeds/google-vehicles.json

// Facebook feed: Returns CSV with all available cars
GET /feeds/meta-vehicles.csv
```

---

## Configuration Required

### Environment Variables

Add to your `.env` file:

```env
PUBLIC_BASE_URL=https://yourdomain.com
```

### Google Merchant Center Setup

1. Feed URL: `https://yourdomain.com/feeds/google-vehicles.json`
2. Fetch schedule: Daily or hourly
3. Feed format: JSON
4. Link Google Ads account for Vehicle Ads

### Facebook Commerce Manager Setup

1. Feed URL: `https://yourdomain.com/feeds/meta-vehicles.csv`
2. Fetch schedule: Daily (recommended)
3. Feed format: CSV
4. Map CSV columns to Facebook fields

---

## Troubleshooting

### Cars Not Appearing in Google

- **Check feed URL**: Verify `PUBLIC_BASE_URL` is set correctly
- **Check feed format**: Visit the feed URL in browser, verify JSON is valid
- **Check Google Merchant Center**: Look for feed processing errors
- **Check car status**: Only `status: 'available'` cars are included
- **Wait for processing**: First feed may take 24-48 hours

### Cars Not Appearing in Facebook

- **Check feed URL**: Verify CSV is accessible
- **Check CSV format**: Ensure proper escaping and headers
- **Check Marketplace eligibility**: Not all businesses are eligible
- **Check Commerce Manager**: Look for import errors
- **Wait for processing**: First catalog may take 3-7 days for approval

### Feed Not Updating

- **Check database**: Verify cars are saved with correct status
- **Check feed endpoint**: Test feed URL directly
- **Check platform schedule**: Verify fetch schedule is set correctly
- **Clear cache**: Some platforms cache feeds; wait for next fetch

---

## Future Enhancements

### Real-Time API Integration

To make publication instant, we can implement:

1. **Google Merchant Center API**
   - Push individual items via API when car is created
   - Update/delete items when car status changes

2. **Facebook Graph API**
   - Create catalog items via API
   - Post to Facebook Page automatically
   - Update Marketplace listings in real-time

3. **Background Job Queue**
   - Use BullMQ or similar for reliable job processing
   - Retry failed API calls
   - Log all publication attempts

### Enhanced Features

- **Image optimization**: Resize/compress images for platform requirements
- **Field mapping**: More sophisticated mapping for platform-specific fields
- **Error handling**: Better error reporting and retry logic
- **Admin dashboard**: Show publication status for each car

---

## Summary

**Current System:**
- ✅ Feed-based approach (simple, reliable)
- ✅ Automatic feed generation when car is created
- ✅ Platforms fetch feeds on schedule
- ⏱️ Updates appear within 1-24 hours (depending on schedule)

**To Make It Work:**
1. Set `PUBLIC_BASE_URL` in `.env`
2. Configure Google Merchant Center feed
3. Configure Facebook Commerce Manager feed
4. Wait for initial processing (1-7 days)
5. Cars will automatically appear in feeds and be picked up by platforms

**For Instant Publication:**
- Implement API-based approach (requires additional development)
- Use Google Merchant Center API
- Use Facebook Graph API
- Add background job queue for reliability

