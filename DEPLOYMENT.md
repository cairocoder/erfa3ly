# Vercel Deployment Guide

## Prerequisites

-   Vercel account
-   GitHub repository with your code
-   All environment variables ready

## Step 1: Environment Variables

Add these environment variables in your Vercel project settings:

### NextAuth Configuration

```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret-key-here
```

### Google OAuth (if using Google sign-in)

```
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret
```

### MongoDB Connection

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Ably (for real-time features)

```
ABLY_API_KEY=your-ably-api-key
```

### Backblaze B2 Configuration

```
B2_ACCOUNT_ID=your-b2-account-id
B2_APPLICATION_KEY=your-b2-application-key
B2_BUCKET_ID=your-b2-bucket-id
```

## Step 2: Deploy to Vercel

1. **Install Vercel CLI** (optional):

    ```bash
    npm i -g vercel
    ```

2. **Deploy via Vercel Dashboard** (recommended):

    - Go to [vercel.com](https://vercel.com)
    - Click "New Project"
    - Import your GitHub repository
    - Configure environment variables
    - Deploy

3. **Or deploy via CLI**:
    ```bash
    vercel
    ```

## Step 3: Post-Deployment

1. **Update Google OAuth Redirect URIs**:

    - Go to Google Cloud Console
    - Add your Vercel domain to authorized redirect URIs:
        - `https://your-domain.vercel.app/api/auth/callback/google`

2. **Test the deployment**:
    - Check if uploads work
    - Test authentication
    - Verify file downloads

## Step 4: Custom Domain (Optional)

1. In Vercel dashboard, go to your project settings
2. Add your custom domain
3. Update `NEXTAUTH_URL` to your custom domain
4. Update Google OAuth redirect URIs

## Troubleshooting

-   **Build errors**: Check the build logs in Vercel dashboard
-   **Environment variables**: Ensure all variables are set correctly
-   **MongoDB connection**: Verify your MongoDB Atlas cluster allows connections from Vercel's IP ranges
-   **File uploads**: Check if Backblaze B2 credentials are correct

## Security Notes

-   Never commit `.env.local` to your repository
-   Use strong, unique secrets for `NEXTAUTH_SECRET`
-   Regularly rotate your API keys
-   Monitor your Vercel usage and costs
