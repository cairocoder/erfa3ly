import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

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
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { filename, contentType, fileSize } = req.body;

        if (!filename || !contentType) {
            return res
                .status(400)
                .json({ error: "Filename and content type are required" });
        }

        console.log("Starting B2 authorization...");

        // Step 1: Authorize with B2 using the official API
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
            const errorText = await authResponse.text();
            console.error("B2 authorization failed:", errorText);
            throw new Error(
                `B2 authorization failed: ${authResponse.status} - ${errorText}`
            );
        }

        const authData = await authResponse.json();
        console.log("B2 authorization successful, API URL:", authData.apiUrl);

        console.log("Getting upload URL...");

        // Step 2: Get upload URL using the official API
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
                        process.env.B2_BUCKET_ID || "8486398a2261ab0777c90f12",
                }),
            }
        );

        if (!uploadUrlResponse.ok) {
            const errorText = await uploadUrlResponse.text();
            console.error("Failed to get upload URL:", errorText);
            throw new Error(
                `Failed to get upload URL: ${uploadUrlResponse.status} - ${errorText}`
            );
        }

        const uploadUrlData = await uploadUrlResponse.json();
        console.log(
            "B2 upload URL retrieved successfully:",
            uploadUrlData.uploadUrl
        );

        console.log("Connecting to MongoDB...");

        // Save upload info to database for tracking
        const client = await clientPromise;
        const dbName = getDatabaseName();
        const db = client.db(dbName);

        const uploadRecord = {
            userId: session.user.id,
            filename: filename,
            originalName: filename,
            size: fileSize || 0,
            mimeType: contentType,
            uploadedAt: new Date(),
            status: "pending",
            uploadUrl: uploadUrlData.uploadUrl,
            authToken: uploadUrlData.authorizationToken,
        };

        console.log("Saving upload record to database...");
        await db.collection("uploads").insertOne(uploadRecord);
        console.log("Upload record saved successfully");

        res.status(200).json({
            uploadUrl: uploadUrlData.uploadUrl,
            authorizationToken: uploadUrlData.authorizationToken,
            uploadId: uploadRecord._id.toString(),
        });
    } catch (error) {
        console.error("Error getting upload URL:", error);
        res.status(500).json({
            error: "Failed to get upload URL",
            details: error.message,
        });
    }
}
