# 📊 Contact Reply System - Architecture & Visual Guide

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   LOCAL DASHBOARD INTERFACE                      │
│                  contact-messages.html                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📧 Contact Messages                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Message Card [ID: 123]                              NEW   │  │
│  | From: John Doe (john@example.com) [Location: USA]      │  │
│  | Subject: Question about your products                   │  │
│  | Preview: I'm interested in learning more about...       │  │
│  | [📨 Reply] [📋 Copy Email] [View Full]                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Message Card [ID: 124]                                   │  │
│  │ (More messages...)                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         │ [Click "📨 Reply"]
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REPLY MODAL DIALOG                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Replying to:                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ John Doe (john@example.com)                              │  │
│  │ Original: "Question about your products"                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Subject Line:                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Re: More information about our premium models         │  │
│  │ [✨ Get AI Suggestion]                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Your Reply:                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Thank you for reaching out! We'd be happy to share      │  │
│  │ more details about our products. Here's what I can      │  │
│  │ tell you...                                             │  │
│  │                                                          │  │
│  │ [Textarea for reply message]                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  [Cancel]                                  [Send Reply] ✓        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─ [Click "✨ Get AI Suggestion"]
         │         │
         │         ▼
         │    ┌──────────────────────────────┐
         │    │  GEMINI LLM (Analyze)        │
         │    │                              │
         │    │ Input:                       │
         │    │  - Original Subject          │
         │    │  - Original Message          │
         │    │                              │
         │    │ Output:                      │
         │    │  Suggested Subject Line      │
         │    └──────────────────────────────┘
         │         │
         │         ▼ (Subject auto-filled)
         │    Modal updates subject field
         │
         └─ [Click "Send Reply"]
                    │
                    ▼
         ┌──────────────────────────────────┐
         │  EMAIL SERVICE (server.js)       │
         │                                  │
         │  1. Validate inputs              │
         │  2. Load template                │
         │  3. Substitute variables:        │
         │     - {{customer_name}}          │
         │     - {{original_subject}}       │
         │     - {{reply_message}}          │
         │     - {{customer_location}}      │
         │     - etc.                       │
         │  4. Escape HTML for safety       │
         │  5. Send via SMTP                │
         └──────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────┐
         │  SUPABASE / GMAIL SMTP SERVER    │
         │                                  │
         │  Credentials:                    │
         │  - SMTP_HOST: smtp.gmail.com     │
         │  - SMTP_PORT: 587                │
         │  - SMTP_USER: your-email@gmail   │
         │  - SMTP_PASSWORD: app-password   │
         └──────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────┐
         │  CUSTOMER EMAIL INBOX            │
         │                                  │
         │  From: MotorVault Support        │
         │  Subject: Re: Question about...  │
         │  Body: [Professional HTML Email] │
         │  + Original message context      │
         └──────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────────┐
         │  SUCCESS NOTIFICATION            │
         │  ✓ Reply sent successfully!      │
         │  Dashboard refreshes             │
         └──────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────┐
│   Browser   │ (contact-messages.html)
│             │
└──────┬──────┘
       │
       ├─ GET /api/contact-messages
       │        │
       │        ▼
       │  ┌────────────────┐
       │  │  Server        │
       │  │  (server.js)   │
       │  └────────┬───────┘
       │           │
       │           ├─ Query Supabase
       │           │        │
       │           │        ▼
       │           │   ┌─────────────────┐
       │           │   │  Supabase       │
       │           │   │  contactus      │
       │           │   │  table          │
       │           │   └────────┬────────┘
       │           │            │
       │           │◄───────────┘
       │           │ (Returns messages)
       │           │
       │   ┌───────▼────────┐
       │   │ [Message List] │
       │   └─────────────────┘
       │  ◄─────────┐
       │           │
       │ [User clicks "Reply"]
       │           │
       ├─ POST /api/contact-messages/:id/suggest-subject
       │           │
       │           ▼
       │    ┌──────────────────────┐
       │    │  server.js           │
       │    │  callLLMForSuggestion │
       │    └──────────┬───────────┘
       │               │
       │               ├─ Import Gemini API
       │               │
       │               ├─ Create prompt with:
       │               │  - original subject
       │               │  - original message
       │               │
       │               ▼
       │    ┌──────────────────────┐
       │    │  Gemini 2.5-flash    │
       │    │  LLM Model           │
       │    │  (Google Cloud)      │
       │    └──────────┬───────────┘
       │               │
       │               ▼
       │    ┌──────────────────────┐
       │    │ Suggested Subject    │
       │    │ "Re: Your question   │
       │    │  about our products" │
       │    └──────────┬───────────┘
       │               │
       ├◄──────────────┘
       │ Response: { suggestedSubject }
       │
       │ [Modal updates subject field]
       │ [User can edit text]
       │
       ├─ POST /api/contact-messages/:id/reply
       │  Request body:
       │  {
       │    "replySubject": "Re: Your question...",
       │    "replyMessage": "Thank you for..."
       │  }
       │           │
       │           ▼
       │    ┌──────────────────────────────────┐
       │    │  server.js                       │
       │    │  - Get original message from DB  │
       │    │  - sendContactReplyEmail()       │
       │    └──────────┬───────────────────────┘
       │               │
       │               ├─ Load template
       │               │  contact-reply.html
       │               │
       │               ├─ Substitute variables:
       │               │  {{customer_name}}
       │               │  {{original_subject}}
       │               │  {{reply_message}}
       │               │  etc.
       │               │
       │               ├─ Escape HTML
       │               │
       │               ├─ Connect to SMTP
       │               │  (nodemailer)
       │               │
       │               ▼
       │    ┌──────────────────────────────────┐
       │    │ Gmail SMTP Server                │
       │    │ smtp.gmail.com:587               │
       │    │ (TLS encryption)                 │
       │    └──────────┬───────────────────────┘
       │               │
       │               ├─ Authenticate
       │               │  (App Password)
       │               │
       │               ├─ Send email via SMTP
       │               │
       │               ▼
       │    ┌──────────────────────────────────┐
       │    │ Customer Email Inbox             │
       │    │                                  │
       │    │ From: MotorVault Support         │
       │    │ To: john@example.com             │
       │    │ Subject: Re: Question about...   │
       │    │                                  │
       │    │ [HTML Email with branding]       │
       │    │ [Original message included]      │
       │    │ [Professional footer]            │
       │    └──────────────────────────────────┘
       │               │
       │               ▼ (Received by customer)
       │    ┌──────────────────────────────────┐
       │    │ Response to browser:             │
       │    │ {                                │
       │    │   "success": true,               │
       │    │   "sentTo": "john@example.com"   │
       │    │ }                                │
       │    └──────────┬───────────────────────┘
       │               │
       ├◄──────────────┘
       │
       │ [Display success notification]
       │ [Refresh message list]
       │
```

---

## Component Interaction

```
┌─────────────────────────────────────────┐
│      FRONT-END (contact-messages.html)   │
│                                           │
│  • Message List Display                  │
│  • Reply Modal Form                      │
│  • AI Suggestion Button                  │
│  • Success/Error Notifications           │
│                                           │
└────────────┬────────────────────────────┘
             │ HTTP Requests
             │ JSON Data
             │
             ▼
┌─────────────────────────────────────────┐
│      BACK-END (server.js)                │
│                                           │
│  API Endpoints:                          │
│  • GET /api/contact-messages             │
│  • POST /suggest-subject                 │
│  • POST /reply                           │
│                                           │
│  Services:                               │
│  • getEmailTransporter()                 │
│  • sendContactReplyEmail()               │
│  • callLLMForSuggestion()                │
│  • loadEmailTemplate()                   │
│                                           │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┬──────────┬──────────┐
      │             │          │          │
      ▼             ▼          ▼          ▼
   Supabase      Gmail SMTP  Gemini     File System
   Database      Server      API        (Templates)
   
   contactus →   Transfer   Process    Templates:
   table         email      message    • contact-
                                         reply.html
```

---

## File Structure

```
modern-ecommerce-site/
│
├── server/
│   ├── _core/
│   │   └── emailService.ts ✏️ (Updated)
│   │       ├── ContactReplyData interface
│   │       └── sendContactReplyEmail() function
│   │
│   └── email_templates/motorvault/
│       └── contact-reply.html ✨ (NEW)
│
├── tools/local-dashboard/
│   ├── package.json ✏️ (Updated - added nodemailer)
│   │
│   ├── server.js ✏️ (Updated)
│   │   ├── sendContactReplyEmail()
│   │   ├── callLLMForSuggestion()
│   │   ├── GET /api/contact-messages
│   │   ├── POST /suggest-subject
│   │   └── POST /reply
│   │
│   ├── client/
│   │   ├── index.html (existing React dashboard)
│   │   ├── contact-messages.html ✨ (NEW - Main UI)
│   │   └── dashboard-home.html ✨ (NEW - Navigation Hub)
│   │
│   └── README.md ✏️ (Updated with feature docs)
│
├── CONTACT_REPLY_SETUP.md ✨ (NEW - Quick Start)
└── CONTACT_REPLY_COMPLETE.md ✨ (NEW - Complete Reference)
```

---

## Email Template Structure

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* Professional MotorVault branding */
      /* Dark Navy: #0f1724 */
      /* Red Accent: #dc2626 */
    </style>
  </head>
  <body>
    <div class="container">
      ┌─────────────────────────────────┐
      │ HEADER                          │
      │ MotorVault Support (Branded)    │
      └─────────────────────────────────┘
      
      ┌─────────────────────────────────┐
      │ GREETING                        │
      │ "Hi {{customer_name}},"          │
      └─────────────────────────────────┘
      
      ┌─────────────────────────────────┐
      │ REPLY MESSAGE                   │
      │ {{reply_message}}                │
      │ (Formatted with <br /> for      │
      │  preserved line breaks)         │
      └─────────────────────────────────┘
      
      ┌─────────────────────────────────┐
      │ ORIGINAL MESSAGE CONTEXT        │
      │ ┌─────────────────────────────┐ │
      │ │ Your Original Message        │ │
      │ │ Subject: {{original_subject}}│ │
      │ │ Location: {{customer_location}}
      │ │                              │ │
      │ │ {{original_message}}         │ │
      │ └─────────────────────────────┘ │
      └─────────────────────────────────┘
      
      ┌─────────────────────────────────┐
      │ FOOTER                          │
      │ Contact: {{support_email}}      │
      │ © {{sender_name}}               │
      └─────────────────────────────────┘
    </div>
  </body>
</html>
```

---

## Request/Response Examples

### 1. Load Messages
```
GET /api/contact-messages

Response (200 OK):
[
  {
    "id": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Question about product",
    "message": "I'm interested in learning more about...",
    "location": "usa"
  },
  ...
]
```

### 2. Get AI Suggestion
```
POST /api/contact-messages/1/suggest-subject
Content-Type: application/json

{}

Response (200 OK):
{
  "suggestedSubject": "Re: Information about our premium models",
  "originalSubject": "Question about product"
}
```

### 3. Send Reply
```
POST /api/contact-messages/1/reply
Content-Type: application/json

{
  "replySubject": "Re: Information about our premium models",
  "replyMessage": "Thank you for reaching out! Here's what I can tell you about our products..."
}

Response (200 OK):
{
  "success": true,
  "message": "Reply email sent successfully",
  "sentTo": "john@example.com"
}
```

---

## Success Flow Example

```
User sees:  "Welcome to Contact Messages!"
            [📧 Message from John Doe]
                  ↓
            Clicks [📨 Reply]
                  ↓
            Modal opens with context
                  ↓
            Clicks [✨ Get AI Suggestion]
                  ↓
            Suggests: "Re: More info about our models"
                  ↓
            User edits if needed, types reply
                  ↓
            Clicks [Send Reply]
                  ↓
            Shows loading spinner...
                  ↓
            ✓ Success! Email sent to john@example.com
                  ↓
            Dashboard refreshes
                  ↓
            Message list updated
```

---

**Everything is ready to use! Start the dashboard and manage your contact messages.** 🚀
