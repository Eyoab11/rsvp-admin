# Event RSVP Admin Dashboard

A modern, responsive admin dashboard for managing events, invitations, attendees, and check-ins. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- **Dashboard Overview**: Real-time statistics and event summaries
- **Event Management**: Create, edit, and manage events with capacity limits
- **Invitation System**: Generate and send personalized invitations
- **Attendee Management**: View, search, and manage registered attendees
- **QR Code Check-in**: Scan QR codes for quick attendee verification
- **Analytics**: Event statistics, registration trends, and attendance tracking
- **Google Sheets Integration**: View and manage attendee data in embedded sheets
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **JWT Authentication**: Secure admin access with token-based auth

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with Lucide icons
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for analytics visualization
- **QR Codes**: qrcode library for generation, ZXing for scanning
- **Authentication**: JWT with middleware protection

## Prerequisites

- Node.js 18+ and npm
- Backend API running (see backend-event-rsvp)
- Admin credentials configured in backend

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rsvp-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Backend API URL
   NEXT_PUBLIC_API_URL=http://localhost:3002/api
   
   # Frontend URL (for invite links)
   NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The admin dashboard will be available at `http://localhost:3001`

## Default Login Credentials

The default admin credentials are configured in the backend:
- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials in the backend `.env` file before deploying to production!

## Project Structure

```
rsvp-admin/
├── app/
│   ├── (auth)/
│   │   └── login/              # Login page
│   ├── (dashboard)/
│   │   ├── analytics/          # Analytics and reports
│   │   ├── attendee-sheet/     # Google Sheets integration
│   │   ├── attendees/          # Attendee management
│   │   ├── check-in/           # QR code check-in
│   │   ├── events/             # Event management
│   │   ├── invites/            # Invitation management
│   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   └── page.tsx            # Dashboard home
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
├── components/
│   ├── ui/                     # Reusable UI components
│   └── Sidebar.tsx             # Navigation sidebar
├── lib/
│   ├── api.ts                  # API client
│   ├── auth.ts                 # Authentication utilities
│   ├── types.ts                # TypeScript types
│   ├── validation.ts           # Form validation schemas
│   └── hooks/                  # Custom React hooks
├── middleware.ts               # Auth middleware
└── public/                     # Static assets
```

## Key Features

### Dashboard Overview
- Real-time event statistics
- Recent registrations
- Capacity tracking
- Quick actions

### Event Management
- Create new events with detailed information
- Set capacity limits and waitlist options
- Edit event details
- View event-specific statistics
- Export attendee lists

### Invitation System
- Generate single or bulk invitations
- Unique invitation tokens with expiration
- Resend invitations
- Copy invitation URLs
- Track invitation status

### Attendee Management
- View all attendees with search and filters
- See registration details and QR codes
- Cancel registrations
- Export attendee data
- View plus-one information

### QR Code Check-in
- Scan QR codes using device camera
- Instant attendee verification
- Check-in status tracking
- Manual QR code entry option

### Analytics
- Registration trends over time
- Event capacity visualization
- Attendee statistics
- Plus-one tracking

### Google Sheets Integration
- Embedded Google Sheets view
- Real-time data synchronization
- Direct sheet editing
- Automatic attendee updates

## API Integration

The admin dashboard communicates with the backend API. All endpoints require JWT authentication.

### Authentication
```typescript
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

### Key Endpoints
- `GET /api/event` - List all events
- `POST /api/event` - Create event
- `GET /api/admin/events/:id/attendees` - Get attendees
- `GET /api/admin/events/:id/stats` - Get statistics
- `POST /api/invite/create` - Create invitation
- `GET /api/qr/validate/:code` - Validate QR code

See the backend API documentation for complete endpoint details.

## Authentication Flow

1. User enters credentials on login page
2. Credentials sent to backend `/api/auth/login`
3. Backend validates and returns JWT token
4. Token stored in localStorage and cookie
5. Middleware checks token on protected routes
6. Token included in all API requests
7. Auto-redirect to login if token expires

## Deployment

### Environment Configuration

1. Update `.env` with production values:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   NEXT_PUBLIC_FRONTEND_URL=https://rsvp.yourdomain.com
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Start the production server:
   ```bash
   npm start
   ```

### Recommended Hosting

- **Vercel** (Recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **DigitalOcean App Platform**
- **Railway**

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

```bash
# Or use Vercel CLI
npm install -g vercel
vercel
```

### Environment Variables in Production

Set these in your hosting platform:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL with /api | `https://api.yourdomain.com/api` |
| `NEXT_PUBLIC_FRONTEND_URL` | Public RSVP frontend URL | `https://rsvp.yourdomain.com` |

## Development

### Running in Development Mode

```bash
# Start dev server on port 3001
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Code Quality

The project uses:
- **ESLint** for code linting
- **TypeScript** for type safety
- **Tailwind CSS** for consistent styling
- **React Hook Form** for form management
- **Zod** for runtime validation

## Responsive Design

The dashboard is fully responsive with breakpoints for:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Features include:
- Mobile-friendly navigation
- Responsive tables with horizontal scroll
- Touch-optimized QR scanner
- Adaptive layouts

## Security

### Authentication
- JWT token-based authentication
- Secure token storage (httpOnly cookies + localStorage)
- Automatic token refresh
- Protected routes with middleware

### Best Practices
- Environment variables for sensitive data
- HTTPS in production
- CORS configuration
- Input validation with Zod
- XSS protection
- CSRF protection

## Troubleshooting

### Common Issues

**Cannot connect to backend**
- Verify `NEXT_PUBLIC_API_URL` in `.env`
- Ensure backend is running
- Check CORS settings in backend

**Login fails**
- Verify admin credentials in backend `.env`
- Check backend logs for errors
- Ensure JWT_SECRET is set in backend

**QR scanner not working**
- Allow camera permissions in browser
- Use HTTPS in production (required for camera access)
- Try manual QR code entry

**Google Sheets not loading**
- Verify sheet is set to "Anyone with link can view"
- Check GOOGLE_SHEET_ID in backend
- Ensure sheet has been initialized

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Related Projects

- **Backend API**: Event RSVP Backend (backend-event-rsvp)
- **Public Frontend**: Event RSVP Form (LEM-Event_RSVP)

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)
- Charts by [Recharts](https://recharts.org/)
- QR codes by [node-qrcode](https://github.com/soldair/node-qrcode) and [ZXing](https://github.com/zxing-js/library)
