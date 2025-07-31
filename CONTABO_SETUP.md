# Contabo Object Storage Integration Guide

## 🚀 **Overview**

This guide will help you integrate Contabo Object Storage with your file upload system. Contabo provides S3-compatible object storage that's cost-effective and reliable.

## 📋 **Prerequisites**

-   ✅ Contabo Object Storage account
-   ✅ Bucket created: `erfa3ly`
-   ✅ Access Key ID and Secret Access Key
-   ✅ Your Next.js application

## 🔧 **Step 1: Install Dependencies**

Install the AWS SDK for S3-compatible storage:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 🔑 **Step 2: Configure Environment Variables**

Add these environment variables to your `.env.local` file:

```bash
# Contabo Object Storage Configuration
CONTABO_ACCESS_KEY_ID=your_access_key_id_here
CONTABO_SECRET_ACCESS_KEY=your_secret_access_key_here

# Optional: Download settings
ALLOW_ANONYMOUS_DOWNLOADS=true
```

## 🌐 **Step 3: Contabo Dashboard Setup**

### **Get Your Credentials**

1. **Login to Contabo Dashboard**

    - Go to [https://my.contabo.com](https://my.contabo.com)
    - Navigate to **Object Storage**

2. **Create Access Keys**

    - Click on **Access Keys**
    - Create a new access key
    - Save the **Access Key ID** and **Secret Access Key**

3. **Bucket Configuration**
    - Ensure your bucket `erfa3ly` is created
    - Set appropriate permissions (private recommended)

## 📁 **Step 4: API Endpoints Created**

### **Upload API: `/api/upload-contabo`**

-   **Method**: POST
-   **Features**:
    -   File type validation
    -   File size limits (100MB max)
    -   Rate limiting
    -   Secure filename generation
    -   Progress tracking
    -   Database logging

### **Download API: `/api/download-contabo`**

-   **Method**: GET
-   **Features**:
    -   Presigned URLs for secure downloads
    -   Access control
    -   Rate limiting
    -   Download logging

## 🧪 **Step 5: Test the Integration**

### **Test Upload**

1. Visit `/contabo-upload` in your browser
2. Select a file to upload
3. Monitor the upload progress
4. Copy the generated download link

### **Test Download**

1. Use the generated download link
2. Verify the file downloads correctly
3. Check that presigned URLs work

## 🔒 **Security Features**

### **Upload Security**

-   ✅ File type validation (MIME + extensions)
-   ✅ File signature validation (magic numbers)
-   ✅ File size limits
-   ✅ Rate limiting (10 uploads per 15 minutes)
-   ✅ Secure filename generation
-   ✅ User quota enforcement (1GB per day)

### **Download Security**

-   ✅ Presigned URLs (1-hour expiry)
-   ✅ Access control
-   ✅ Download rate limiting
-   ✅ Activity logging
-   ✅ Path traversal prevention

## 📊 **Database Schema**

The system stores upload records in MongoDB:

```javascript
{
  userId: "user_id",
  filename: "secure_filename.ext",
  originalName: "original_filename.ext",
  size: 1234567,
  mimeType: "image/jpeg",
  uploadedAt: new Date(),
  downloadUrl: "https://erfa3ly.com/download/filename",
  storageType: "contabo",
  bucketName: "erfa3ly",
  s3Key: "secure_filename.ext"
}
```

## 🔧 **Configuration Options**

### **File Size Limits**

```javascript
MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
MAX_TOTAL_SIZE: 1024 * 1024 * 1024, // 1GB per user per day
```

### **Rate Limiting**

```javascript
RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
RATE_LIMIT_MAX_UPLOADS: 10, // Max uploads per window
```

### **Download Settings**

```javascript
DOWNLOAD_RATE_LIMIT: 100, // Downloads per hour
PRESIGNED_URL_EXPIRY: 3600, // 1 hour
```

## 🎯 **Usage Examples**

### **Upload File**

```javascript
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload-contabo", {
    method: "POST",
    body: formData,
});

const result = await response.json();
console.log("Upload successful:", result.url);
```

### **Download File**

```javascript
const response = await fetch(`/api/download-contabo?filename=${filename}`);
const result = await response.json();

// Redirect to presigned URL
window.location.href = result.downloadUrl;
```

## 🔍 **Monitoring and Logging**

### **Upload Logs**

-   File upload attempts and results
-   Security violations
-   Rate limit violations
-   User quota usage

### **Download Logs**

-   Download requests
-   Presigned URL generation
-   Access control events

### **Database Collections**

-   `uploads`: File metadata and upload records
-   `downloads`: Download activity logs

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Authentication Errors**

```bash
# Check environment variables
echo $CONTABO_ACCESS_KEY_ID
echo $CONTABO_SECRET_ACCESS_KEY
```

#### **2. Bucket Not Found**

```bash
# Verify bucket name in code
const BUCKET_NAME = "erfa3ly";
```

#### **3. CORS Issues**

```bash
# Configure CORS in Contabo dashboard
# Allow your domain for cross-origin requests
```

#### **4. File Size Limits**

```bash
# Check file size in code
MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
```

### **Debug Commands**

```bash
# Check environment variables
node -e "console.log(process.env.CONTABO_ACCESS_KEY_ID)"

# Test S3 connection
node -e "
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
    region: 'us-east-1',
    endpoint: 'https://usc1.contabostorage.com',
    credentials: {
        accessKeyId: process.env.CONTABO_ACCESS_KEY_ID,
        secretAccessKey: process.env.CONTABO_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});
client.send(new ListBucketsCommand()).then(console.log).catch(console.error);
"
```

## 📈 **Performance Optimization**

### **Upload Optimization**

-   Stream large files
-   Use multipart uploads for files > 100MB
-   Implement retry logic
-   Monitor upload progress

### **Download Optimization**

-   Use presigned URLs for direct access
-   Implement caching headers
-   Monitor download performance
-   Set appropriate expiry times

## 🔄 **Migration from B2**

If you're migrating from Backblaze B2:

1. **Keep both systems running** during transition
2. **Update frontend** to use new Contabo endpoints
3. **Migrate existing files** if needed
4. **Update database records** with new storage type
5. **Test thoroughly** before switching

## 📞 **Support**

### **Contabo Support**

-   **Documentation**: [https://docs.contabo.com](https://docs.contabo.com)
-   **API Reference**: S3-compatible API
-   **Dashboard**: [https://my.contabo.com](https://my.contabo.com)

### **AWS SDK Documentation**

-   **S3 Client**: [https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-examples.html](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-examples.html)
-   **Presigned URLs**: [https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-presigned-urls.html](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-presigned-urls.html)

## ✅ **Checklist**

-   [ ] Install AWS SDK dependencies
-   [ ] Configure environment variables
-   [ ] Set up Contabo access keys
-   [ ] Test upload functionality
-   [ ] Test download functionality
-   [ ] Configure monitoring
-   [ ] Set up logging
-   [ ] Test security features
-   [ ] Update documentation
-   [ ] Deploy to production

---

**Last Updated**: [Date]
**Version**: 1.0
**Storage Provider**: Contabo Object Storage
