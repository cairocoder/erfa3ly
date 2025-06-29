import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

const b2cs = require("b2-cloud-storage");

let b2 = new b2cs({
    auth: {
        accountId: "002469a21b779f20000000006",
        applicationKey: "K002uoa1O51CtYSJuhkB55OYsoXaIhA",
    },
});

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

        // Authorize with B2
        await new Promise((resolve, reject) => {
            b2.authorize((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Get upload URL
        const uploadUrlResponse = await new Promise((resolve, reject) => {
            b2.getUploadUrl(
                {
                    bucketId: "8486398a2261ab0777c90f12",
                },
                (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                }
            );
        });

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
            uploadUrl: uploadUrlResponse.uploadUrl,
            authToken: uploadUrlResponse.authorizationToken,
        };

        await db.collection("uploads").insertOne(uploadRecord);

        res.status(200).json({
            uploadUrl: uploadUrlResponse.uploadUrl,
            authorizationToken: uploadUrlResponse.authorizationToken,
            uploadId: uploadRecord._id.toString(),
        });
    } catch (error) {
        console.error("Error getting upload URL:", error);
        res.status(500).json({ error: "Failed to get upload URL" });
    }
}
