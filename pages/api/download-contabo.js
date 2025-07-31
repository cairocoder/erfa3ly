import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Contabo S3 Client Configuration
const s3Client = new S3Client({
    region: "us-east-1", // Contabo uses us-east-1
    endpoint: "https://usc1.contabostorage.com",
    credentials: {
        accessKeyId: process.env.CONTABO_ACCESS_KEY_ID,
        secretAccessKey: process.env.CONTABO_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Required for S3-compatible storage
});

const BUCKET_NAME = "erfa3ly";

// Security configuration
const SECURITY_CONFIG = {
    ALLOW_ANONYMOUS_DOWNLOADS: process.env.ALLOW_ANONYMOUS_DOWNLOADS === "true",
    DOWNLOAD_RATE_LIMIT: 100, // Downloads per hour per user/IP
    DOWNLOAD_RATE_WINDOW: 60 * 60 * 1000, // 1 hour
    PRESIGNED_URL_EXPIRY: 3600, // 1 hour
};

// In-memory rate limiting store (use Redis in production)
const downloadRateLimitStore = new Map();

const checkDownloadRateLimit = (userId, ip) => {
    const key = userId || ip;
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.DOWNLOAD_RATE_WINDOW;

    if (!downloadRateLimitStore.has(key)) {
        downloadRateLimitStore.set(key, []);
    }

    const downloads = downloadRateLimitStore.get(key);
    const recentDownloads = downloads.filter(
        (timestamp) => timestamp > windowStart
    );
    downloadRateLimitStore.set(key, recentDownloads);

    if (recentDownloads.length >= SECURITY_CONFIG.DOWNLOAD_RATE_LIMIT) {
        return false;
    }

    recentDownloads.push(now);
    return true;
};

const getDatabaseName = () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) return "erfa3ly";

    try {
        const url = new URL(uri);
        const pathParts = url.pathname
            .split("/")
            .filter((part) => part.length > 0);
        return pathParts[pathParts.length - 1] || "erfa3ly";
    } catch (error) {
        console.error("Error parsing MongoDB URI:", error);
        return "erfa3ly";
    }
};

const sanitizeFilename = (filename) => {
    // Remove path traversal attempts and dangerous characters
    return filename
        .replace(/\.\./g, "") // Remove path traversal
        .replace(/[^a-zA-Z0-9.-]/g, "_") // Only allow safe characters
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "");
};

const get = async (req, res) => {
    try {
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({ error: "Filename is required" });
        }

        // Sanitize filename
        const sanitizedFilename = sanitizeFilename(filename);

        // Get user session and IP
        const session = await getServerSession(req, res, authOptions);
        const ip =
            req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // Check if anonymous downloads are allowed
        if (!SECURITY_CONFIG.ALLOW_ANONYMOUS_DOWNLOADS && !session?.user?.id) {
            return res.status(401).json({ error: "Authentication required" });
        }

        // Check download rate limit
        if (!checkDownloadRateLimit(session?.user?.id, ip)) {
            return res.status(429).json({
                error: "Download rate limit exceeded. Please try again later.",
            });
        }

        // Verify file exists and get metadata from database
        let fileMetadata = null;
        if (session?.user?.id) {
            try {
                const client = await clientPromise;
                const dbName = getDatabaseName();
                const db = client.db(dbName);

                fileMetadata = await db.collection("uploads").findOne({
                    filename: sanitizedFilename,
                    storageType: "contabo",
                });

                // If file exists in database, check if user owns it or if it's public
                if (fileMetadata && fileMetadata.userId !== session.user.id) {
                    // For now, we'll allow downloads of all Contabo files
                    // You can implement more granular access control here
                    console.log(
                        `User ${session.user.id} downloading file owned by ${fileMetadata.userId}`
                    );
                }
            } catch (dbError) {
                console.error("Database error:", dbError);
                // Continue without metadata
            }
        }

        // Check if file exists in S3
        try {
            const headCommand = new HeadObjectCommand({
                Bucket: BUCKET_NAME,
                Key: sanitizedFilename,
            });

            await s3Client.send(headCommand);
        } catch (error) {
            if (
                error.name === "NotFound" ||
                error.$metadata?.httpStatusCode === 404
            ) {
                return res.status(404).json({ error: "File not found" });
            }
            console.error("S3 head object error:", error);
            return res.status(500).json({ error: "Error checking file" });
        }

        // Generate presigned URL for secure download
        try {
            const getCommand = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: sanitizedFilename,
                ResponseContentDisposition: `attachment; filename="${
                    fileMetadata?.originalName || sanitizedFilename
                }"`,
                ResponseContentType:
                    fileMetadata?.mimeType || "application/octet-stream",
            });

            const presignedUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: SECURITY_CONFIG.PRESIGNED_URL_EXPIRY,
            });

            // Log download activity
            if (session?.user?.id) {
                try {
                    const client = await clientPromise;
                    const dbName = getDatabaseName();
                    const db = client.db(dbName);

                    await db.collection("downloads").insertOne({
                        userId: session.user.id,
                        filename: sanitizedFilename,
                        downloadedAt: new Date(),
                        ip: ip,
                        userAgent: req.headers["user-agent"],
                        storageType: "contabo",
                    });
                } catch (logError) {
                    console.error("Error logging download:", logError);
                }
            }

            // Return the presigned URL
            return res.status(200).json({
                downloadUrl: presignedUrl,
                filename: fileMetadata?.originalName || sanitizedFilename,
                expiresIn: SECURITY_CONFIG.PRESIGNED_URL_EXPIRY,
                message: "Download URL generated successfully",
            });
        } catch (error) {
            console.error("Error generating presigned URL:", error);
            return res
                .status(500)
                .json({ error: "Failed to generate download URL" });
        }
    } catch (error) {
        console.error("Download error:", error);
        return res.status(500).json({ error: "Download failed" });
    }
};

const methods = (req, res) => {
    switch (req.method) {
        case "GET":
            return get(req, res);
        default:
            return res.status(405).json({ error: "Method not allowed" });
    }
};

export default methods;
