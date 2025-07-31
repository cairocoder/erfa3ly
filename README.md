# Erfa3ly - File Sharing Platform

A modern file sharing platform built with Next.js, featuring secure uploads, user authentication, and file management.

## Features

-   **File Upload & Sharing**: Secure file uploads with progress tracking and cancellation
-   **User Authentication**: Email/password and Google OAuth authentication
-   **Upload History**: Track and manage your uploaded files
-   **Copy & Share**: Easy file sharing with copy-to-clipboard and native sharing
-   **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

-   **Frontend**: Next.js 15, React 18, Bootstrap 5
-   **Authentication**: NextAuth.js
-   **Database**: MongoDB
-   **File Storage**: Backblaze B2
-   **Real-time Updates**: Ably

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth (Optional - for Google sign-in)
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/erfa3ly

# Ably Configuration
ABLY_API_KEY=your-ably-api-key
```

### 3. Database Setup

1. Install and start MongoDB locally, or use MongoDB Atlas
2. Create a database named `erfa3ly`
3. The application will automatically create the required collections

### 4. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/callback/google` to authorized redirect URIs
6. Copy the Client ID and Client Secret to your `.env.local` file

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### For Users

1. **Sign Up/In**: Use email/password or Google OAuth
2. **Upload Files**: Drag and drop or select files to upload
3. **Track Progress**: Monitor upload progress with real-time updates
4. **Cancel Uploads**: Cancel uploads at any time
5. **View History**: Access your upload history in the profile section
6. **Share Files**: Copy links or use native sharing features

### For Developers

-   **API Endpoints**:
    -   `POST /api/upload` - Upload files
    -   `DELETE /api/upload` - Cancel uploads
    -   `GET /api/uploads` - Get user's upload history
    -   `GET /api/auth/*` - Authentication endpoints

## Modernization Notes

-   **Font Optimization:** The project now uses the Inter font from Google Fonts via the new `next/font` API for optimal performance and privacy.
-   **App Router Migration:**
    -   To start using the new App Router, create an `app/` directory at the project root.
    -   You can incrementally move pages from `pages/` to `app/`.
    -   See: https://nextjs.org/docs/app/building-your-application/routing

## Thank You
