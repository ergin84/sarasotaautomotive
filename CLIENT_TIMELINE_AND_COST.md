## Sarasota Automotive Website — Timing and Cost Proposal

### Executive Summary
This proposal covers the complete delivery of the Sarasota Automotive website described in the repository, including public inventory (sale/rental), rental inquiries with email notifications, and an authenticated admin dashboard for full management. Estimated delivery is 6–8 weeks, with a blended team. We present both fixed-price and time-and-materials options.

### Scope Overview
- Public website with responsive UI (home, cars for sale, cars for rent, car detail)
- Rental inquiry flow with email notifications and storage of requests
- Admin dashboard (JWT auth) with inventory and rental request management
- Backend (Express), Database (MongoDB/Mongoose), Email (Nodemailer), Frontend (HTML/CSS/Vanilla JS)
- Environment configuration and deployment-ready setup

### Key Assumptions
- Existing feature set in `README.md` is authoritative; no major new features beyond it
- SMTP provider and domain/DNS are available or provisioned by client
- One production environment and one staging environment
- Up to 2 feedback rounds per milestone are included
- Content (logo, brand colors, basic copy) supplied by client

### Hosting & Infrastructure (USA Recommendation)
- Primary: Vercel (frontend hosting + edge) with a Node.js serverless or server runtime, or Render for long-lived Node processes
- Alternative (single vendor): Railway or Render for Node + MongoDB (managed)
- Database: MongoDB Atlas (US region, e.g., AWS us-east-1). Free/low tiers to start, scale as needed
- DNS: Client retains domain at current registrar; point A/AAAA/CNAME records to hosting provider
- Backups: Daily automated backups in MongoDB Atlas; 7–14 day retention to start
- Monitoring: Basic error tracking (e.g., Sentry) and uptime monitoring (e.g., UptimeRobot)

Estimated infra cost (starter): $25–$75/month (Render/Railway), $9–$25/month (MongoDB Atlas M0/M2), scale as traffic grows

### Deliverables
- Source code and configuration
- Admin user initialization and credentials handoff
- Environment setup guides (`.env` examples) and runbooks
- Basic deployment pipeline scripts/instructions
- Acceptance test checklist and smoke tests

### Email & DNS Management (USA)
- Mailboxes: Google Workspace for business mail (your domain) for reliability and support
- Transactional emails: Use Amazon SES or SendGrid for application emails (rental inquiry notifications)
- DNS records to configure: SPF, DKIM, DMARC for the domain; MX for Google Workspace; CNAME/Verification for SES/SendGrid
- Recommendation: Keep marketing/newsletter on a separate sender (Mailchimp/Brevo) to protect transactional deliverability

Setup effort: ~6–10 hours including DNS, verification, test sends, and failover plan

### Project Plan and Timeline
Week counts are indicative; some tasks overlap.

1) Inception & Setup (0.5 week)
- Project kickoff, backlog shaping, environment setup, CI hooks

2) Core Backend & Data Models (1.0–1.5 weeks)
- Mongoose models (`User`, `Car`, `RentalRequest`), auth (JWT), routing
- Email notification integration (Nodemailer) and configuration

3) Public Frontend (1.0–1.5 weeks)
- Home page, cars for sale/rent lists, car detail view
- Responsive layout and base styling; accessibility pass (AA-minded basics)

4) Admin Dashboard (1.5–2.0 weeks)
- Authentication, inventory CRUD, mark-as-sold, rental request management, dashboard widgets

5) QA, Hardening, and UAT (1.0 week)
- Cross-browser, mobile, error handling, security checks; UAT cycles

6) Launch Prep and Handover (0.5 week)
- Staging/prod config, docs, runbooks, knowledge transfer

Total duration: 6–8 weeks

Optional Add-On Milestone: Commerce Integrations (1.0–2.0 weeks)
- Facebook vehicle catalog/data feed, Google Merchant Center vehicle ads feed, scheduling and monitoring

### Resource Plan (indicative)
- Backend Engineer: 0.6–0.8 FTE for 5–6 weeks
- Frontend Engineer: 0.5–0.7 FTE for 4–5 weeks
- QA Engineer: 0.3 FTE for 2 weeks (peak in QA/UAT)
- Project Manager: 0.2 FTE throughout (ceremonies, reporting)
- Designer (lightweight): 0.1 FTE for 1–2 weeks (polish and responsive details)

### Estimated Effort (hours)
| Area | Hours (low) | Hours (high) |
| --- | ---: | ---: |
| Inception & Setup | 16 | 24 |
| Backend & Models | 60 | 80 |
| Email Integration | 10 | 16 |
| Public Frontend | 56 | 72 |
| Admin Dashboard | 72 | 96 |
| QA & Hardening | 40 | 56 |
| Launch & Handover | 16 | 24 |
| PM/Coordination | 24 | 32 |
| Design Polish | 8 | 16 |
| Contingency (10%) | 30 | 42 |
| **Total** | **332** | **458** |

Notes:
- Contingency covers integration unknowns, minor change requests, and environment issues

### Rates and Cost
Indicative blended rates (can be adjusted to your standard):
- Backend/Frontend Engineer: $85/hour
- QA Engineer: $65/hour
- Project Manager: $95/hour
- Designer: $90/hour

Blended average across plan: ~$85/hour

Cost estimate:
- Low (332 hours × $85): ~$28,220
- High (458 hours × $85): ~$38,930

Fixed-Price Option:
- Fixed cap for defined scope: $34,500 (includes up to 2 feedback cycles per milestone and 10% contingency). Change requests beyond scope handled via change control.

Time & Materials Option:
- Billed monthly at actuals with weekly timesheets; range $28k–$39k based on scope stability

Add-On (Facebook/Google Integrations):
- Estimate: 40–80 hours ($3,400–$6,800) depending on catalog complexity, feed scheduling, and approvals

### Payment Schedule (Fixed-Price)
- 30% at kickoff
- 40% at completion of Admin Dashboard milestone
- 30% at handover and production readiness sign-off

### Risks and Mitigations
- SMTP/Email deliverability setup delays → Start early; provide fallback SMTP provider
- Scope creep during UAT → Use change control, prioritize must-haves, hold nice-to-haves for a follow-up phase
- Data quality/seed content availability → Provide seed scripts; align on required fields early
- Facebook/Google policy or account approval delays → Begin account verification early; maintain manual upload fallback

### Out of Scope (can be quoted separately)
- Advanced analytics dashboards, multi-tenant admin, payment processing, third-party marketplace integrations
- Complex role-based access beyond single admin role
- Fully custom design system or component library
- Native checkout/ecommerce; the current site lists vehicles but does not process payments
- Guaranteed approvals for ad platforms (policy compliance is required by platforms)

### Facebook Marketplace & Google Integration Plan
- Facebook (Meta) options:
  - Create a Vehicle Catalog in Commerce Manager and enable Auto Inventory Ads
  - Data feed approaches: JSON/CSV feed endpoint from this app, or scheduled file export to cloud storage (S3/Drive) and pull by Meta
  - Fields: title, price, condition, mileage, VIN (if available), description, images, availability, location
  - Note: Facebook Marketplace eligibility varies by region and business type; we set up the catalog and ads, but Marketplace visibility is subject to Meta policies
- Google options:
  - Google Merchant Center (Vehicle Ads) with a vehicles feed; requires GMC account and verification
  - Fields: make, model, year, price, mileage, condition, image_link, description, address/region; policy compliance required
  - Visibility: Vehicle Ads appear on Google surfaces; standard Shopping is for retail products, not vehicles
- Implementation details:
  - Build a read-only feed endpoint (authenticated) providing inventory in platform-required schema
  - Scheduled feed refresh (daily/hourly) and feed validation dashboard
  - Mapping from internal `Car` fields to platform schemas; image sizing and CDN optimization
  - UAT with limited subset, then full rollout

### Automation on New Car Insert (Add-On)
When a new car is created in the admin, the system will trigger an automation pipeline to:

1) Post to Facebook Company Page
- Use Meta Graph API to publish a Page post with images, price, specs, and a link to the car detail page
- Requirements: Meta Business account, Facebook Page admin access, Meta App with permissions (`pages_manage_posts`, `pages_read_engagement`, and possibly `pages_show_list`), long-lived Page access token
- Notes: Post formatting will use a templated caption with UTM tags for attribution

2) Add to Facebook Marketplace via Catalog (if eligible)
- Direct API posting to Marketplace is not generally available; the supported approach is a Vehicle Catalog in Commerce Manager
- On insert, we update the Vehicle Catalog feed (push JSON/CSV to a secure URL or storage) and notify/schedule catalog sync
- Marketplace visibility is controlled by Meta policies and eligibility; we will prepare the catalog and ensure fields and images meet requirements

3) Create/Update Google Merchant Center and Launch Ads
- Maintain a GMC vehicles feed; on insert, update feed and signal refresh
- For ads, either: (a) prepare campaign/ad group templates and launch via Google Ads UI, or (b) automate via Google Ads API
- API automation requires OAuth consent, Google Ads API access, and account linking (GMC ↔ Google Ads)
- Use templated headlines/descriptions and final URL with UTM parameters for performance tracking

Workflow & Architecture
- Emit a domain event on `Car` creation (e.g., `car.created`)
- Queue jobs (e.g., BullMQ/Cloud tasks) for: Page Post, Meta Catalog Update, GMC Feed Update, Optional Ads API actions
- Implement retries with backoff; log to monitoring; provide admin visibility for job status

Prerequisites (Client/Accounts)
- Meta Business + Facebook Page admin access; approve required app permissions
- Google Merchant Center and Google Ads accounts, verified and linked to the domain
- OAuth credentials securely stored (e.g., environment variables or secret manager)

Estimated Effort (subset of Add-On hours)
- Facebook Page post automation: 10–20 hours
- Facebook Vehicle Catalog feed & scheduling: 16–24 hours
- Google Merchant Center feed & validation: 12–18 hours
- Optional Google Ads API campaign automation: 12–20 hours
- Total for this automation bundle: 50–82 hours ($4,250–$6,970 at ~$85/hr)

Deliverables for Automation
- Configurable post template for Facebook Page
- Validated Meta Vehicle Catalog feed with scheduled refresh
- Validated GMC vehicles feed with scheduled refresh
- Optional: scripted creation/update of Ads campaigns/ad groups or playbook for manual launch

### Client-Owned Domain and Accounts
- Domain remains with client; we request temporary DNS access or specific records to add
- Client owns hosting accounts (Vercel/Render/Railway), MongoDB Atlas, Google Workspace, SES/SendGrid, Meta Business, and Google Merchant Center
- We deliver least-privilege collaborator access and transfer ownership at project end

### Change Control
- Any new features or material changes will be sized within 1–2 business days and quoted before implementation. Schedule impact will be updated with each approved change.

### Next Steps
1) Approve pricing model (Fixed vs T&M)
2) Confirm environments (staging/prod) and SMTP provider
3) Provide brand assets and initial content
4) Schedule kickoff (availability this and next week)

Prepared for: Sarasota Automotive
Prepared by: Delivery Team
Date: {{today}}


