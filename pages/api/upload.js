import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import base64 from "base64-encode-decode";
import formidable from "formidable";

export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
};

// Helper function to get database name from MongoDB URI
const getDatabaseName = () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in environment variables");
        return "erfa3ly";
    }

    try {
        const url = new URL(uri);
        const pathParts = url.pathname
            .split("/")
            .filter((part) => part.length > 0);
        const dbName = pathParts[pathParts.length - 1] || "erfa3ly";
        return dbName;
    } catch (error) {
        console.error("Error parsing MongoDB URI:", error);
        return "erfa3ly";
    }
};

export default async function handler(req, res) {
    if (req.method === "POST") {
        try {
            const session = await getServerSession(req, res, authOptions);

            if (!session) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            // Parse the multipart form data
            const form = new formidable.IncomingForm({
                maxFileSize: 10_000_000_000, // 10GB
                maxFields: 1,
                allowEmptyFiles: false,
            });

            const { fields, files } = await new Promise((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve({ fields, files });
                });
            });

            // Get the file from the parsed form data
            const file = files.file;
            if (!file) {
                return res.status(400).json({ error: "No file provided" });
            }

            const filename = Date.now() + "_" + file.originalFilename;
            console.log("Processing upload for:", filename);

            // Step 1: Authorize with B2
            const authResponse = await fetch(
                "https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Basic ${Buffer.from(
                            `${
                                process.env.B2_ACCOUNT_ID ||
                                "002469a21b779f20000000006"
                            }:${
                                process.env.B2_APPLICATION_KEY ||
                                "K002uoa1O51CtYSJuhkB55OYsoXaIhA"
                            }`
                        ).toString("base64")}`,
                    },
                }
            );

            if (!authResponse.ok) {
                throw new Error(
                    `B2 authorization failed: ${authResponse.status}`
                );
            }

            const authData = await authResponse.json();

            // Step 2: Get upload URL
            const uploadUrlResponse = await fetch(
                `${authData.apiUrl}/b2api/v2/b2_get_upload_url`,
                {
                    method: "POST",
                    headers: {
                        Authorization: authData.authorizationToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bucketId:
                            process.env.B2_BUCKET_ID ||
                            "8486398a2261ab0777c90f12",
                    }),
                }
            );

            if (!uploadUrlResponse.ok) {
                throw new Error(
                    `Failed to get upload URL: ${uploadUrlResponse.status}`
                );
            }

            const uploadUrlData = await uploadUrlResponse.json();

            // Step 3: Upload file to B2
            const fs = require("fs");
            const fileBuffer = fs.readFileSync(file.filepath);
            const crypto = require("crypto");
            const sha1Hash = crypto
                .createHash("sha1")
                .update(fileBuffer)
                .digest("hex");

            const b2UploadResponse = await fetch(uploadUrlData.uploadUrl, {
                method: "POST",
                headers: {
                    Authorization: uploadUrlData.authorizationToken,
                    "Content-Type": file.mimetype,
                    "Content-Length": fileBuffer.length.toString(),
                    "X-Bz-File-Name": filename,
                    "X-Bz-Content-Sha1": sha1Hash,
                },
                body: fileBuffer,
            });

            if (!b2UploadResponse.ok) {
                const errorText = await b2UploadResponse.text();
                throw new Error(
                    `B2 upload failed: ${b2UploadResponse.status} - ${errorText}`
                );
            }

            const b2UploadResult = await b2UploadResponse.json();

            // Step 4: Save to database
            const client = await clientPromise;
            const dbName = getDatabaseName();
            const db = client.db(dbName);

            const uploadRecord = {
                userId: session.user.id,
                filename: filename,
                originalName: file.originalFilename,
                size: fileBuffer.length,
                mimeType: file.mimetype,
                uploadedAt: new Date(),
                status: "completed",
                fileId: b2UploadResult.fileId,
                completedAt: new Date(),
                downloadUrl: `https://erfa3ly.com/download/${filename}`,
            };

            await db.collection("uploads").insertOne(uploadRecord);

            res.status(200).json({
                success: true,
                filename: base64.base64Encode(filename),
                downloadUrl: `https://erfa3ly.com/download/${filename}`,
            });
        } catch (error) {
            console.error("Upload error:", error);
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === "DELETE") {
        // Handle upload cancellation
        try {
            const session = await getServerSession(req, res, authOptions);
            if (!session) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { fieldId } = req.body;
            if (!fieldId) {
                return res.status(400).json({ error: "Field ID is required" });
            }

            // Cancel the upload (implementation depends on your upload tracking)
            console.log("Cancelling upload for field ID:", fieldId);

            res.status(200).json({
                success: true,
                message: "Upload cancelled",
            });
        } catch (error) {
            console.error("Cancel error:", error);
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}
