import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

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

        const {
            uploadId,
            fileId,
            filename,
            originalName,
            fileSize,
            contentType,
        } = req.body;

        if (!uploadId || !fileId || !filename) {
            return res.status(400).json({
                error: "Upload ID, file ID, and filename are required",
            });
        }

        // Update the upload record in database
        const client = await clientPromise;
        const dbName = getDatabaseName();
        const db = client.db(dbName);

        const updateResult = await db.collection("uploads").updateOne(
            { _id: new ObjectId(uploadId), userId: session.user.id },
            {
                $set: {
                    fileId: fileId,
                    status: "completed",
                    downloadUrl: `https://erfa3ly.com/download/${filename}`,
                    completedAt: new Date(),
                },
            }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ error: "Upload record not found" });
        }

        res.status(200).json({
            success: true,
            filename: filename,
            downloadUrl: `https://erfa3ly.com/download/${filename}`,
        });
    } catch (error) {
        console.error("Error completing upload:", error);
        res.status(500).json({ error: "Failed to complete upload" });
    }
}
