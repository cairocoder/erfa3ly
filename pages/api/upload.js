const b2cs = require("b2-cloud-storage");
import formidable from "formidable";
import { extname } from "path";
import Ably from "ably";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

// Store active uploads with their cancellation status
global.activeUploads = new Map();
global.ably = new Ably.Realtime(
    "LObVIA.-Xrj3A:IGVxQ6RDqWeKj7bFnzILx1Mt3qTMKL-rh43QiJxWP8s"
);

global.channel = global.ably.channels.get("test");

let b2 = new b2cs({
    auth: {
        accountId: "002469a21b779f20000000006", // NOTE: This is the accountId unique to the key
        applicationKey: "K002uoa1O51CtYSJuhkB55OYsoXaIhA",
    },
});

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

// Helper function to get database name from MongoDB URI
const getDatabaseName = () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in environment variables");
        return "erfa3ly"; // fallback
    }

    try {
        // Parse the URI to extract database name
        const url = new URL(uri);
        const pathParts = url.pathname
            .split("/")
            .filter((part) => part.length > 0);
        const dbName = pathParts[pathParts.length - 1] || "erfa3ly";
        console.log("Extracted database name from URI:", dbName);
        return dbName;
    } catch (error) {
        console.error("Error parsing MongoDB URI:", error);
        return "erfa3ly"; // fallback
    }
};

const post = async (req, res) => {
    // Configure formidable for large files
    const form = new formidable.IncomingForm({
        maxFileSize: 10_000_000_000, // 10GB
        maxFields: 1,
        allowEmptyFiles: false,
        filter: function ({ name, originalFilename, mimetype }) {
            // Only allow files, not fields
            return mimetype && mimetype.includes("image");
        },
    });

    form.parse(req, async function (err, fields, files) {
        if (err) {
            console.error("Form parsing error:", err);
            return res.status(400).json({ error: "Failed to parse form data" });
        }

        if (!files.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        const filename = Date.now() + extname(files.file.originalFilename);
        const uploadId = Date.now().toString();

        // Get user session if available
        const session = await getServerSession(req, res, authOptions);

        // Store upload info for potential cancellation
        global.activeUploads.set(uploadId, {
            fileId: null,
            filename: filename,
            cancelled: false,
            startTime: Date.now(),
            userId: session?.user?.id || null,
            isLargeFile: false, // Track if this is a large file upload
        });

        try {
            await uploadFile(files.file, filename, uploadId, session);
            return res.status(201).json({ url: filename, uploadId });
        } catch (error) {
            console.error("Upload error:", error);
            global.activeUploads.delete(uploadId);
            return res.status(500).json({ error: "Upload failed" });
        }
    });
};

const uploadFile = (file, filename, uploadId, session) => {
    return new Promise((resolve, reject) => {
        var percent = -1;
        const uploadInfo = global.activeUploads.get(uploadId);

        if (!uploadInfo) {
            reject(new Error("Upload not found"));
            return;
        }

        b2.authorize(function (err) {
            if (err) {
                global.activeUploads.delete(uploadId);
                reject(err);
                return;
            }

            // this function wraps both a normal upload AND a large file upload
            b2.uploadFile(
                file?.filepath,
                {
                    bucketId: "8486398a2261ab0777c90f12",
                    fileName: filename, // this is the object storage "key". Can include a full path
                    contentType: file.mimetype,
                    // partSize: 5_000_000,
                    // progressInterval: 5000,
                    onFileId: function (id) {
                        uploadInfo.fileId = id;
                        // Check if this is a large file upload by looking at the fileId format
                        uploadInfo.isLargeFile =
                            id.includes("_f") && id.split("_").length > 3;
                        global.activeUploads.set(uploadId, uploadInfo);
                        global.channel.publish("fieldId", id);
                    },
                    onUploadProgress: function (update) {
                        // Check if cancellation was requested
                        const currentUploadInfo =
                            global.activeUploads.get(uploadId);
                        if (currentUploadInfo && currentUploadInfo.cancelled) {
                            console.log(
                                "Upload cancelled during progress update"
                            );
                            return;
                        }

                        if (update.percent > percent || percent === -1) {
                            global.channel.publish("progress", update);
                        }
                        percent = update.percent;
                    },
                },
                async function (err, results) {
                    if (err) {
                        console.error("B2 upload error:", err);
                        global.activeUploads.delete(uploadId);
                        reject(err);
                    } else {
                        console.log("Upload completed successfully");

                        // Save upload record to database if user is logged in
                        if (session?.user?.id) {
                            try {
                                const client = await clientPromise;
                                // Use the database name from the connection string or default to 'erfa3ly'
                                const dbName = getDatabaseName();
                                const db = client.db(dbName);

                                await db.collection("uploads").insertOne({
                                    userId: session.user.id,
                                    filename: filename,
                                    originalName: file.originalFilename,
                                    size: file.size,
                                    mimeType: file.mimetype,
                                    uploadedAt: new Date(),
                                    downloadUrl: `https://erfa3ly.com/download/${filename}`,
                                });

                                console.log(
                                    "Upload record saved to database:",
                                    dbName
                                );
                            } catch (dbError) {
                                console.error(
                                    "Error saving upload record:",
                                    dbError
                                );
                                // Don't fail the upload if database save fails
                            }
                        }

                        global.activeUploads.delete(uploadId);
                        resolve(results);
                    }
                }
            );
        });
    });
};

const cancel = async (req, res) => {
    try {
        let fieldId = null;

        // Handle different types of cancellation requests
        if (req.headers["content-type"]?.includes("application/json")) {
            // For Next.js API routes, we need to parse the body manually since bodyParser is disabled
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
    let isLargeFile = false;

    for (const [uploadId, uploadInfo] of global.activeUploads.entries()) {
        if (uploadInfo.fileId === fieldId) {
            uploadInfo.cancelled = true;
            isLargeFile = uploadInfo.isLargeFile;
            global.activeUploads.set(uploadId, uploadInfo);
            foundUpload = true;
            console.log(
                `Marked upload ${uploadId} as cancelled (large file: ${isLargeFile})`
            );
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

    // Cancel the file in B2
    b2.authorize(function (err) {
        if (err) {
            console.error("B2 authorization error during cancellation:", err);
            return res
                .status(500)
                .json({ error: "Failed to authorize with B2" });
        }

        if (isLargeFile) {
            // Cancel large file upload
            b2.cancelLargeFile(
                {
                    fileId: fieldId,
                },
                function (err, data) {
                    if (err) {
                        console.error("B2 large file cancellation error:", err);
                        return res.status(500).json({
                            error: "Failed to cancel large file in B2",
                        });
                    }

                    console.log("Large file cancelled successfully in B2");
                    res.status(200).json({
                        message: "Large file upload cancelled successfully",
                        fieldId: fieldId,
                    });
                }
            );
        } else {
            // For regular files, we can't cancel them once uploaded
            // We can only delete them if needed
            console.log(
                "Regular file upload cannot be cancelled after completion"
            );
            res.status(200).json({
                message:
                    "Regular file upload cannot be cancelled after completion",
                fieldId: fieldId,
            });
        }
    });
};

const methods = (req, res) => {
    switch (req.method) {
        case "POST":
            return post(req, res);
        case "DELETE":
            return cancel(req, res);
        case "GET":
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
