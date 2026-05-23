# 📧 Contact Message Reply System - Quick Start Guide

## What Was Built

A complete contact message management system in the local dashboard that lets you reply to customer contact messages with:
- ✨ AI-generated subject line suggestions (Gemini LLM)
- 📧 Professional HTML email templates
- 📋 Clean, intuitive UI for managing replies

## Getting Started

### 1. Install Dependencies
```bash
cd tools/local-dashboard
npm install
```

This installs the required `nodemailer` package for email sending.

### 2. Start the Dashboard
```bash
npm start
```

The dashboard will start on `http://localhost:6060`

### 3. Access Contact Messages
Navigate to: `http://localhost:6060/contact-messages.html`

You'll see a list of all contact messages from your `contactus` table.

## Using the Feature

### View Messages
- Messages are displayed in cards showing:
  - Customer name and email
  - Message subject
  - Message preview (truncated)
  - When it was received
  - Location (USA, Switzerland, Poland, etc.)

### Reply to a Message
1. Click the **"📨 Reply"** button on any message
2. The reply modal opens showing:
   - Who you're replying to (customer name + email)
   - A pre-filled subject line: "Re: {original subject}"
   - A text area for your reply message

### Customize Your Subject (Optional)
Click **"✨ Get AI Suggestion"** to:
1. Send original message content to Gemini LLM
2. Get an AI-generated subject line
3. Edit it if you want before sending

The AI suggestion is smart about:
- Context from the original message
- Professional tone
- Being concise and relevant

### Send the Reply
1. Write your response in the message area
2. Edit the subject line if needed
3. Click **"Send Reply"**
4. Success! Email is sent to the customer

A success toast notification appears confirming the email was sent.

## Technical Details

### Files Modified/Created

**Email Setup:**
- `server/email_templates/motorvault/contact-reply.html` - HTML template for reply emails
- `server/_core/emailService.ts` - Added `sendContactReplyEmail()` function

**Dashboard Backend:**
- `tools/local-dashboard/server.js` - Added API endpoints:
  - `GET /api/contact-messages` - List all messages
  - `POST /api/contact-messages/:id/suggest-subject` - Get AI subject suggestion
  - `POST /api/contact-messages/:id/reply` - Send reply email

**Dashboard Frontend:**
- `tools/local-dashboard/client/contact-messages.html` - Contact message UI
- `tools/local-dashboard/package.json` - Added nodemailer dependency

### Email Template Variables

The reply email uses these variables (auto-filled):
- `{{customer_name}}` - Customer's name
- `{{original_subject}}` - Original message subject
- `{{original_message}}` - Original message body
- `{{customer_location}}` - Their location (USA, Switzerland, etc.)
- `{{reply_message}}` - Your reply text
- `{{support_email}}` - Support email address
- `{{sender_name}}` - Your company name (MotorVault)

### Email Configuration

The system uses your existing SMTP configuration from `.env.local`:
- `SMTP_HOST` - SMTP server (default: smtp.gmail.com)
- `SMTP_PORT` - SMTP port (default: 587)
- `SMTP_USER` - Email account
- `SMTP_PASSWORD` - Email password or App Password
- `SMTP_FROM_EMAIL` - From email address
- `SENDER_NAME` - Name shown in "From" field

Make sure these are configured in `.env.local` for the feature to work.

## API Endpoints

All endpoints are local-only (no authentication). They're immediately available when the dashboard starts.

### GET /api/contact-messages
Returns all contact messages, ordered by newest first.

**Response:**
```json
[
  {
    "id": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Question about product",
    "message": "I'm interested in...",
    "location": "usa"
  }
]
```

### POST /api/contact-messages/:id/suggest-subject
Generate an AI-suggested subject line for a reply.

**Request:**
```json
{}
```

**Response:**
```json
{
  "suggestedSubject": "Re: More information about our premium models",
  "originalSubject": "Question about product"
}
```

### POST /api/contact-messages/:id/reply
Send a reply email to a customer.

**Request:**
```json
{
  "replySubject": "Re: Your question about our products",
  "replyMessage": "Thank you for reaching out! Here's what I can tell you..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reply email sent successfully",
  "sentTo": "john@example.com"
}
```

## Troubleshooting

### "Email service not available"
- Check that `SMTP_USER` and `SMTP_PASSWORD` are set in `.env.local`
- Verify Gmail App Password format (no spaces)
- Check that SMTP credentials are correct

### "LLM service not available"
- Check that `GOOGLE_API_KEY` is set in `.env.local`
- The system falls back to a default subject if LLM is unavailable
- Subject suggestions are optional—you can always edit manually

### "Failed to load messages"
- Verify Supabase URL and service key are correct
- Check that the `contactus` table exists in your Supabase database
- Ensure service key has access to the table

### Email not sending
- Check SMTP configuration in `.env.local`
- Verify the customer email in the message is valid
- Check server logs for detailed error messages
- Try sending a test email from the main app's contact form first

## Next Steps

### Optional Enhancements
1. **Track Replies** - Add a `replied_at` column to track when messages were replied to
2. **Reply Templates** - Create a library of common reply templates for quick responses
3. **Bulk Replies** - Reply to multiple similar messages at once
4. **Email Preview** - Preview the email before sending
5. **Search/Filter** - Filter messages by customer, subject, date, or location
6. **Authentication** - Add login if you deploy this beyond local development

### Integration
- The contact message UI is in `contact-messages.html`
- You can add a link to it from the main dashboard index page
- Or integrate it into the main React dashboard in `client/src/main.jsx`

## Notes

- ⚠️ This dashboard is **local-only**. Don't expose it publicly without authentication.
- All SMTP credentials are kept in your local `.env.local` file.
- The service key should never be shared or committed to version control.
- Email templates use simple `{{variable}}` substitution—easy to customize.
- Replies are sent immediately and not saved to the database (sends directly to email).

---

Enjoy managing customer messages! 🚀
