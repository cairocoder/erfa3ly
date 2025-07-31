import formidable from "formidable";
import { extname } from "path";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import crypto from "crypto";

export const config = {
    api: {
        bodyParser: false,
    },
};

// Store active uploads with their cancellation status
global.activeUploads = new Map();
// Global upload progress tracking
global.uploadProgress = new Map();

// Contabo S3 Client Configuration
const s3Client = new S3Client({
    region: "us-east-1", // Contabo uses us-east-1
    endpoint: "https://usc1.contabostorage.com",
    credentials: {
        accessKeyId: "fa5b8d72443812b9682948e7112ddbb5",
        secretAccessKey: "4f70f8892fffeecb292d7248e89e549c",
    },
    forcePathStyle: true, // Required for S3-compatible storage
    computeChecksums: false, // Disable MD5 hash calculation to avoid stream issues
});

const BUCKET_NAME = "erfa3ly";

// Security configuration
const SECURITY_CONFIG = {
    // Allowed file types (MIME types and extensions)
    ALLOWED_MIME_TYPES: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/bmp",
        "image/tiff",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/json",
        "application/xml",
        "video/mp4",
        "video/webm",
        "video/avi",
        "video/mov",
        "video/wmv",
        "video/flv",
        "video/mkv",
        "audio/mpeg",
        "audio/wav",
        "audio/mp3",
        "audio/aac",
        "audio/ogg",
        "audio/flac",
        "application/zip",
        "application/x-rar-compressed",
        "application/x-7z-compressed",
        "application/x-tar",
        "application/gzip",
        "application/x-bzip2",
    ],
    ALLOWED_EXTENSIONS: [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".bmp",
        ".tiff",
        ".tif",
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
        ".csv",
        ".json",
        ".xml",
        ".mp4",
        ".webm",
        ".avi",
        ".mov",
        ".wmv",
        ".flv",
        ".mkv",
        ".mp3",
        ".wav",
        ".aac",
        ".ogg",
        ".flac",
        ".zip",
        ".rar",
        ".7z",
        ".tar",
        ".gz",
        ".bz2",
    ],

    // File size limits (in bytes)
    MAX_FILE_SIZE: 1024 * 1024 * 1024, // 1GB
    MAX_TOTAL_SIZE: 5 * 1024 * 1024 * 1024, // 5GB per user per day

    // Rate limiting
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX_UPLOADS: 10, // Max uploads per window
};

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map();

// File signature validation (magic numbers)
const FILE_SIGNATURES = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/gif": [0x47, 0x49, 0x46],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
    "application/pdf": [0x25, 0x50, 0x44, 0x46],
    "application/zip": [0x50, 0x4b, 0x03, 0x04],
    "application/x-rar-compressed": [0x52, 0x61, 0x72, 0x21],
};

// Helper functions
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .replace(/_{2,}/g, "_")
        .replace(/^_+|_+$/g, "");
};

const generateSecureFilename = (originalName, extension) => {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString("hex");
    const sanitizedExt = sanitizeFilename(extension);
    return `${timestamp}_${randomBytes}${sanitizedExt}`;
};

const validateFileSignature = async (filepath, expectedMimeType) => {
    try {
        const fs = require("fs").promises;
        const buffer = await fs.readFile(filepath);
        const signature = FILE_SIGNATURES[expectedMimeType];

        if (!signature) return true; // No signature defined for this type

        return signature.every((byte, index) => buffer[index] === byte);
    } catch (error) {
        console.error("Error validating file signature:", error);
        return false;
    }
};

const checkRateLimit = (userId, ip) => {
    const key = userId || ip;
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, []);
    }

    const uploads = rateLimitStore.get(key);
    const recentUploads = uploads.filter(
        (timestamp) => timestamp > windowStart
    );
    rateLimitStore.set(key, recentUploads);

    if (recentUploads.length >= SECURITY_CONFIG.RATE_LIMIT_MAX_UPLOADS) {
        return false;
    }

    recentUploads.push(now);
    return true;
};

const checkUserQuota = async (userId, fileSize) => {
    if (!userId) return true; // Anonymous users have no quota

    try {
        const client = await clientPromise;
        const dbName = getDatabaseName();
        const db = client.db(dbName);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const userUploads = await db
            .collection("uploads")
            .aggregate([
                {
                    $match: {
                        userId: userId,
                        uploadedAt: { $gte: today },
                        storageType: "contabo",
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSize: { $sum: "$size" },
                    },
                },
            ])
            .toArray();

        const currentUsage =
            userUploads.length > 0 ? userUploads[0].totalSize : 0;
        const newTotal = currentUsage + fileSize;

        return newTotal <= SECURITY_CONFIG.MAX_TOTAL_SIZE;
    } catch (error) {
        console.error("Error checking user quota:", error);
        return false; // Fail secure
    }
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

// Cleanup function to remove old uploads
const cleanupOldUploads = () => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [uploadId, uploadInfo] of global.activeUploads.entries()) {
        if (now - uploadInfo.startTime > maxAge) {
            console.log(`Cleaning up old upload: ${uploadId}`);
            global.activeUploads.delete(uploadId);
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupOldUploads, 5 * 60 * 1000);

const post = async (req, res) => {
    try {
        // Get user session and IP
        const session = await getServerSession(req, res, authOptions);
        const ip =
            req.headers["x-forwarded-for"] || req.connection.remoteAddress;

        // Check rate limiting
        if (!checkRateLimit(session?.user?.id, ip)) {
            return res.status(429).json({
                error: "Rate limit exceeded. Please try again later.",
            });
        }

        const form = new formidable.IncomingForm({
            maxFileSize: SECURITY_CONFIG.MAX_FILE_SIZE,
        });

        form.parse(req, async function (err, fields, files) {
            if (err) {
                console.error("Form parsing error:", err);
                return res
                    .status(400)
                    .json({ error: "Failed to parse form data" });
            }

            if (!files.file) {
                return res.status(400).json({ error: "No file provided" });
            }

            const file = files.file;

            // Basic file validation
            if (!file.originalFilename || !file.mimetype) {
                return res.status(400).json({ error: "Invalid file data" });
            }

            // Check file size
            if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
                return res.status(413).json({
                    error: `File too large. Maximum size is ${
                        SECURITY_CONFIG.MAX_FILE_SIZE / (1024 * 1024)
                    }MB (${SECURITY_CONFIG.MAX_FILE_SIZE} bytes)`,
                });
            }

            // Validate MIME type
            if (!SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                return res.status(400).json({
                    error: `File type not allowed. Allowed types: ${SECURITY_CONFIG.ALLOWED_EXTENSIONS.join(
                        ", "
                    )}`,
                });
            }

            // Validate file extension
            const extension = extname(file.originalFilename).toLowerCase();
            if (!SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
                return res.status(400).json({
                    error: "File extension not allowed",
                });
            }

            // Check user quota
            if (!(await checkUserQuota(session?.user?.id, file.size))) {
                return res.status(413).json({
                    error: "Daily upload quota exceeded",
                });
            }

            // Validate file signature
            const isValidSignature = await validateFileSignature(
                file.filepath,
                file.mimetype
            );
            if (!isValidSignature) {
                return res.status(400).json({
                    error: "File content does not match declared type",
                });
            }

            const originalName = sanitizeFilename(file.originalFilename);
            const secureFilename = generateSecureFilename(
                originalName,
                extension
            );
            const uploadId = fields.uploadId || Date.now().toString();

            // Store upload info for potential cancellation
            global.activeUploads.set(uploadId, {
                fileId: null,
                filename: secureFilename,
                cancelled: false,
                startTime: Date.now(),
                userId: session?.user?.id || null,
                isLargeFile: false,
            });

            try {
                await uploadFile(file, secureFilename, uploadId, session);
                return res.status(201).json({ url: secureFilename, uploadId });
            } catch (error) {
                console.error("Upload error:", error);
                global.activeUploads.delete(uploadId);
                return res.status(500).json({ error: "Upload failed" });
            }
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ error: "Upload failed" });
    }
};

const uploadFile = (file, filename, uploadId, session) => {
    return new Promise((resolve, reject) => {
        const uploadInfo = global.activeUploads.get(uploadId);

        if (!uploadInfo) {
            reject(new Error("Upload not found"));
            return;
        }

        const fs = require("fs");

        // Create a new readable stream from the file
        const fileStream = fs.createReadStream(file.filepath);

        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: filename,
            Body: fileStream,
            ContentType: file.mimetype,
            Metadata: {
                "original-filename": sanitizeFilename(file.originalFilename),
                "upload-id": uploadId,
                "user-id": session?.user?.id || "anonymous",
            },
        };

        // Initialize progress tracking
        global.uploadProgress.set(uploadId, 0);
        console.log(`Initialized progress for uploadId ${uploadId}: 0%`);

        console.log(
            `Starting S3 upload for uploadId ${uploadId}, file size: ${file.size} bytes`
        );

        // Create upload manager for real progress tracking
        const upload = new Upload({
            client: s3Client,
            params: uploadParams,
        });

        // Track real upload progress
        upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
                const progressPercentage = Math.round(
                    (progress.loaded / progress.total) * 100
                );
                global.uploadProgress.set(uploadId, progressPercentage);
                console.log(
                    `Real progress for uploadId ${uploadId}: ${progressPercentage}% (${progress.loaded}/${progress.total} bytes)`
                );
            }
        });

        upload
            .done()
            .then(async (result) => {
                console.log(
                    `S3 upload completed successfully for uploadId ${uploadId}`
                );

                // Update progress to 100%
                global.uploadProgress.set(uploadId, 100);
                console.log(`Set progress for uploadId ${uploadId}: 100%`);

                // Save upload record to database if user is logged in
                if (session?.user?.id) {
                    try {
                        const client = await clientPromise;
                        const dbName = getDatabaseName();
                        const db = client.db(dbName);

                        await db.collection("uploads").insertOne({
                            userId: session.user.id,
                            filename: filename,
                            originalName: file.originalFilename,
                            size: file.size,
                            mimeType: file.mimetype,
                            uploadedAt: new Date(),
                            downloadUrl: `https://erfa3ly.com/api/download-contabo?filename=${filename}`,
                            storageType: "contabo",
                            bucketName: BUCKET_NAME,
                            s3Key: filename,
                        });

                        console.log("Upload record saved to database:", dbName);
                    } catch (dbError) {
                        console.error("Error saving upload record:", dbError);
                        // Don't fail the upload if database save fails
                    }
                }

                global.activeUploads.delete(uploadId);
                global.uploadProgress.delete(uploadId);
                resolve(result);
            })
            .catch((error) => {
                console.error(
                    `S3 upload error for uploadId ${uploadId}:`,
                    error
                );
                global.activeUploads.delete(uploadId);
                global.uploadProgress.delete(uploadId);
                reject(error);
            });
    });
};

const cancel = async (req, res) => {
    try {
        let fieldId = null;

        // Handle different types of cancellation requests
        if (req.headers["content-type"]?.includes("application/json")) {
            const chunks = [];

            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", async () => {
                try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    fieldId = body.fieldId;
                    await performCancellation(fieldId, res);
                } catch (error) {
                    console.error("Error parsing JSON body:", error);
                    res.status(400).json({ error: "Invalid JSON body" });
                }
            });
        } else {
            // Legacy support - try to find the most recent upload
            let mostRecentUpload = null;
            let mostRecentTime = 0;

            for (const [
                uploadId,
                uploadInfo,
            ] of global.activeUploads.entries()) {
                if (uploadInfo.startTime > mostRecentTime) {
                    mostRecentTime = uploadInfo.startTime;
                    mostRecentUpload = uploadInfo;
                }
            }

            if (mostRecentUpload && mostRecentUpload.fileId) {
                fieldId = mostRecentUpload.fileId;
            }

            await performCancellation(fieldId, res);
        }
    } catch (error) {
        console.error("Cancellation error:", error);
        res.status(500).json({ error: "Failed to cancel upload" });
    }
};

const performCancellation = async (fieldId, res) => {
    if (!fieldId) {
        console.log("No file ID found for cancellation");
        return res
            .status(200)
            .json({ message: "No active upload found to cancel" });
    }

    console.log(`Attempting to cancel upload with fieldId: ${fieldId}`);

    // Mark upload as cancelled in our tracking
    let foundUpload = false;

    for (const [uploadId, uploadInfo] of global.activeUploads.entries()) {
        if (uploadInfo.fileId === fieldId) {
            uploadInfo.cancelled = true;
            global.activeUploads.set(uploadId, uploadInfo);
            foundUpload = true;
            console.log(`Marked upload ${uploadId} as cancelled`);
            break;
        }
    }

    if (!foundUpload) {
        console.log(
            `Upload with fieldId ${fieldId} not found in active uploads`
        );
        return res
            .status(200)
            .json({ message: "Upload not found in active uploads" });
    }

    // For S3, we can't cancel uploads in progress, but we can delete the object if it was uploaded
    console.log("S3 upload cancellation completed");
    res.status(200).json({
        message: "Upload cancelled successfully",
        fieldId: fieldId,
    });
};

const methods = (req, res) => {
    switch (req.method) {
        case "POST":
            return post(req, res);
        case "DELETE":
            return cancel(req, res);
        case "GET":
            // Handle progress requests
            const { uploadId } = req.query;
            if (uploadId) {
                const progress = global.uploadProgress.get(uploadId) || 0;
                console.log(
                    `Progress request for uploadId ${uploadId}: ${progress}%`
                );
                return res.status(200).json({ progress });
            }
            // Return active uploads for debugging
            return res.status(200).json({
                activeUploads: Array.from(global.activeUploads.entries()),
                count: global.activeUploads.size,
            });
        default:
            return res.status(405).json({ error: "Method not allowed" });
    }
};

export default methods;
