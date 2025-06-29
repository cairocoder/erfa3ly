import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

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

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session) {
            console.log("No session found in uploads API");
            return res.status(401).json({ error: "Unauthorized" });
        }

        console.log("Session found in uploads API:", session.user?.email);

        const client = await clientPromise;
        const dbName = getDatabaseName();
        const db = client.db(dbName);

        console.log("Fetching uploads for user:", session.user.id);
        console.log("Using database:", dbName);

        // Get user's uploads from the uploads collection
        const uploads = await db
            .collection("uploads")
            .find({
                userId: session.user.id,
            })
            .sort({ uploadedAt: -1 }) // Most recent first
            .limit(100) // Limit to 100 most recent uploads
            .toArray();

        console.log("Found uploads:", uploads.length);

        return res.status(200).json({ uploads });
    } catch (error) {
        console.error("Error fetching uploads:", error);
        return res.status(500).json({
            error: "Internal server error",
            details: error.message,
        });
    }
}
