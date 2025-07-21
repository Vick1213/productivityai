# Email Notification System

This document describes the comprehensive email notification system for high priority tasks using Resend.

## Overview

The email notification system automatically sends beautifully designed HTML emails to users when their high priority tasks are due soon or overdue. The system includes:

- 🎨 **Beautiful HTML emails** styled to match the website's design
- ⏰ **Smart scheduling** - sends emails at most once every 12-24 hours per task
- 🎯 **High priority focus** - only sends emails for HIGH priority tasks
- 📧 **Resend integration** - reliable email delivery
- 🏢 **Organization context** - includes project and organization information
- 📱 **Mobile-friendly** - responsive email design

## Features

### Email Content
- Task name, description, and notes
- Due date with formatted time
- Priority badge (HIGH priority only)
- Project and organization information (if available)
- Assigned user information
- Direct link to dashboard
- Professional styling with brand colors

### Smart Logic
- **Rate limiting**: Same notification type sent at most once per 12-24 hours
- **High priority only**: Only HIGH priority tasks trigger emails
- **Due date logic**: 
  - Tasks overdue → immediate notification
  - Tasks due within 2 hours → urgent notification
  - Tasks due within 24 hours → advance warning
- **Completion check**: No emails sent for completed tasks

### Email Types
1. **Due Soon**: For tasks due within 24 hours
2. **Overdue**: For tasks past their due date

## Setup Instructions

### 1. Environment Variables

Add these variables to your `.env.local` file:

```env
# Required for email notifications
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=tasks@yourdomain.com

# Optional (defaults to localhost:3000 in development)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Resend Account Setup

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use the sandbox domain for testing
3. Generate an API key from the dashboard
4. Add the API key to your environment variables

### 3. Domain Configuration (Production)

For production emails, you'll need to:

1. **Add your domain** to Resend
2. **Verify DNS records** (SPF, DKIM, DMARC)
3. **Set from email** to match your domain (e.g., `notifications@yourcompany.com`)

## Architecture

### Core Components

#### 1. Email Service (`/lib/email.ts`)
- `generateTaskReminderHTML()` - Creates beautiful HTML emails
- `sendTaskReminderEmail()` - Sends individual task emails
- `shouldSendTaskReminder()` - Smart logic for when to send
- `hasRecentEmailNotification()` - Rate limiting logic

#### 2. Background Service (`/lib/emailService.ts`)
- `checkAndSendTaskEmails()` - Processes all eligible tasks
- `startEmailService()` - Runs every 2 hours automatically
- `stopEmailService()` - Graceful shutdown

#### 3. API Endpoints

**`POST /api/notifications/email`**
- Manually trigger email sending for all eligible tasks
- Returns results for each task processed

**`GET /api/notifications/email`**
- Get list of tasks eligible for email reminders
- Useful for debugging and preview

**`POST /api/notifications/email-service`**
- Manage the background service
- Actions: `start`, `stop`, `check`

#### 4. Settings UI (`/dashboard/settings`)
- Email notification preferences
- Service status and controls
- List of eligible tasks
- Manual email triggers
- Setup instructions

### Email Template Features

#### Styling
- Matches website brand colors (green primary: `#26D16D`)
- Professional layout with cards and badges
- Mobile-responsive design
- Dark/light mode considerations

#### Content Structure
```
Header
├── Task status badge (OVERDUE/DUE SOON)
├── Organization & project info
├── Task card with details
│   ├── Task name & description
│   ├── Priority badge
│   ├── Assigned user
│   └── Additional notes
├── Prominent due date display
├── Call-to-action button
└── Footer with unsubscribe options
```

## Usage

### Automatic Operation

The system runs automatically once set up:

1. **Service starts** when the app launches
2. **Checks every 2 hours** for eligible tasks
3. **Sends emails** based on smart logic
4. **Rate limits** to avoid spam

### Manual Controls

Via the Settings page (`/dashboard/settings`):

- **Start/Stop Service**: Control the background service
- **Check Now**: Trigger immediate check
- **Send Test Emails**: Send emails for all eligible tasks
- **View Eligible Tasks**: See which tasks will get emails

### API Usage

```javascript
// Start the email service
const response = await fetch('/api/notifications/email-service', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
});

// Send emails manually
const response = await fetch('/api/notifications/email', {
  method: 'POST'
});

// Get eligible tasks
const response = await fetch('/api/notifications/email');
const data = await response.json();
console.log(data.eligibleTasks);
```

## Email Design

The email template includes:

### Visual Elements
- **Gradient header** with brand colors
- **Status badges** with appropriate colors
- **Card-based layout** for clean organization
- **Icon usage** for visual hierarchy
- **Hover effects** on buttons

### Typography
- **System fonts** for broad compatibility
- **Clear hierarchy** with proper font weights
- **Readable sizes** optimized for email clients

### Color Scheme
```css
Primary: #26D16D (Green)
Danger: #ef4444 (Red for overdue)
Warning: #f59e0b (Orange for urgent)
Gray scales: Various grays for text hierarchy
```

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check RESEND_API_KEY is set correctly
   - Verify domain is configured in Resend
   - Check service is running in Settings

2. **Emails going to spam**
   - Configure SPF, DKIM, DMARC records
   - Use a verified domain
   - Avoid spam trigger words

3. **Wrong sender email**
   - Set RESEND_FROM_EMAIL environment variable
   - Ensure email matches verified domain

4. **Service not starting**
   - Check console for errors
   - Verify database connection
   - Restart application

### Debugging

1. **Check Settings Page**: View service status and eligible tasks
2. **API Endpoints**: Use manual endpoints to test functionality  
3. **Console Logs**: Check server logs for email sending attempts
4. **Resend Dashboard**: View delivery status and analytics

## Rate Limiting Details

The system implements smart rate limiting to prevent spam:

- **Overdue emails**: Max once per 24 hours per task
- **Due soon emails**: Max once per 24 hours per task  
- **Urgent emails** (< 2 hours): Max once per 2 hours per task
- **Per-task tracking**: Prevents duplicate emails for same task
- **Memory storage**: Uses Map for tracking (consider Redis for production scale)

## Security Considerations

- **API key encryption**: Resend API key stored as environment variable
- **User authentication**: All endpoints require valid user session
- **Rate limiting**: Prevents email abuse
- **Data privacy**: Only sends task data to assigned user's email
- **No sensitive data**: Emails contain only basic task information

## Production Recommendations

1. **Use Redis** for email tracking instead of in-memory storage
2. **Add email preferences** to user model for granular control
3. **Implement unsubscribe** functionality
4. **Add email analytics** tracking
5. **Consider timezone handling** for due dates
6. **Monitor email deliverability** metrics
7. **Implement retry logic** for failed sends

## Contributing

When extending the email system:

1. **Update email template** in `generateTaskReminderHTML()`
2. **Modify sending logic** in `shouldSendTaskReminder()`
3. **Add new email types** by extending the notification types
4. **Test thoroughly** with various task configurations
5. **Update documentation** for any new features

## License

This email notification system is part of the ProductivityAI platform and follows the same licensing terms.
