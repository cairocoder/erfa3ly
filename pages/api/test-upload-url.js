import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "../../lib/mongodb";

const b2cs = require("b2-cloud-storage");

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const session = await getServerSession(req, res, authOptions);

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const results = {
            session: "✅ Authenticated",
            environment: {},
            b2: {},
            mongodb: {},
        };

        // Check environment variables
        results.environment.mongodb_uri = process.env.MONGODB_URI
            ? "✅ Set"
            : "❌ Missing";
        results.environment.b2_account_id = process.env.B2_ACCOUNT_ID
            ? "✅ Set"
            : "❌ Missing";
        results.environment.b2_application_key = process.env.B2_APPLICATION_KEY
            ? "✅ Set"
            : "❌ Missing";
        results.environment.b2_bucket_id = process.env.B2_BUCKET_ID
            ? "✅ Set"
            : "❌ Missing";

        // Test MongoDB connection
        try {
            const client = await clientPromise;
            const db = client.db();
            await db.admin().ping();
            results.mongodb.connection = "✅ Connected";

            // Test database name extraction
            const uri = process.env.MONGODB_URI;
            if (uri) {
                try {
                    const url = new URL(uri);
                    const pathParts = url.pathname
                        .split("/")
                        .filter((part) => part.length > 0);
                    const dbName = pathParts[pathParts.length - 1] || "erfa3ly";
                    results.mongodb.database_name = `✅ ${dbName}`;
                } catch (error) {
                    results.mongodb.database_name = `❌ Error parsing URI: ${error.message}`;
                }
            }
        } catch (error) {
            results.mongodb.connection = `❌ Error: ${error.message}`;
        }

        // Test B2 connection
        try {
            const b2 = new b2cs({
                auth: {
                    accountId:
                        process.env.B2_ACCOUNT_ID ||
                        "002469a21b779f20000000006",
                    applicationKey:
                        process.env.B2_APPLICATION_KEY ||
                        "K002uoa1O51CtYSJuhkB55OYsoXaIhA",
                },
            });

            await new Promise((resolve, reject) => {
                b2.authorize((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            results.b2.authorization = "✅ Authorized";

            // Test getting upload URL - using correct method signature
            const uploadUrlResponse = await new Promise((resolve, reject) => {
                b2.getUploadUrl(
                    process.env.B2_BUCKET_ID || "8486398a2261ab0777c90f12",
                    (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    }
                );
            });

            results.b2.upload_url = "✅ Retrieved";
            results.b2.upload_url_data = {
                uploadUrl: uploadUrlResponse.uploadUrl
                    ? "✅ Present"
                    : "❌ Missing",
                authorizationToken: uploadUrlResponse.authorizationToken
                    ? "✅ Present"
                    : "❌ Missing",
            };
        } catch (error) {
            results.b2.authorization = `❌ Error: ${error.message}`;
        }

        res.status(200).json(results);
    } catch (error) {
        console.error("Test error:", error);
        res.status(500).json({
            error: "Test failed",
            details: error.message,
            stack: error.stack,
        });
    }
}
