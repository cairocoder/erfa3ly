import { getSession } from "next-auth/react";
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
        console.log("Testing MongoDB connection...");
        console.log(
            "MONGODB_URI:",
            process.env.MONGODB_URI ? "Set" : "Not set"
        );

        const client = await clientPromise;
        console.log("MongoDB client connected successfully");

        const dbName = getDatabaseName();
        console.log("Using database name:", dbName);

        const db = client.db(dbName);
        console.log("Database object created");

        // List all collections in the database
        const collections = await db.listCollections().toArray();
        console.log(
            "Collections in database:",
            collections.map((c) => c.name)
        );

        // Test the uploads collection specifically
        const uploadsCollection = db.collection("uploads");
        const uploadsCount = await uploadsCollection.countDocuments();
        console.log("Number of documents in uploads collection:", uploadsCount);

        return res.status(200).json({
            status: "success",
            message: "MongoDB connection successful",
            database: dbName,
            collections: collections.map((c) => c.name),
            uploadsCount: uploadsCount,
            uri: process.env.MONGODB_URI ? "Set" : "Not set",
        });
    } catch (error) {
        console.error("MongoDB connection error:", error);
        return res.status(500).json({
            error: "MongoDB connection failed",
            details: error.message,
            stack: error.stack,
        });
    }
}
