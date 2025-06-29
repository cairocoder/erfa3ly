import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

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
            environment: {},
            b2_auth: {},
            b2_upload_url: {},
        };

        // Check environment variables
        results.environment.b2_account_id = process.env.B2_ACCOUNT_ID
            ? "✅ Set"
            : "❌ Missing";
        results.environment.b2_application_key = process.env.B2_APPLICATION_KEY
            ? "✅ Set"
            : "❌ Missing";
        results.environment.b2_bucket_id = process.env.B2_BUCKET_ID
            ? "✅ Set"
            : "❌ Missing";

        // Test B2 authorization
        try {
            console.log("Testing B2 authorization...");
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

            console.log("Auth response status:", authResponse.status);
            console.log("Auth response headers:", authResponse.headers);

            if (!authResponse.ok) {
                const errorText = await authResponse.text();
                results.b2_auth.status = `❌ Failed: ${authResponse.status}`;
                results.b2_auth.error = errorText;
                console.error("B2 authorization failed:", errorText);
            } else {
                const authData = await authResponse.json();
                results.b2_auth.status = "✅ Success";
                results.b2_auth.api_url = authData.apiUrl;
                results.b2_auth.auth_token_length = authData.authorizationToken
                    ? authData.authorizationToken.length
                    : 0;
                results.b2_auth.account_id = authData.accountId;
                results.b2_auth.allowed = authData.allowed;

                console.log("B2 authorization successful:", authData);

                // Test getting upload URL
                console.log("Testing upload URL request...");
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

                console.log(
                    "Upload URL response status:",
                    uploadUrlResponse.status
                );
                console.log(
                    "Upload URL response headers:",
                    uploadUrlResponse.headers
                );

                if (!uploadUrlResponse.ok) {
                    const errorText = await uploadUrlResponse.text();
                    results.b2_upload_url.status = `❌ Failed: ${uploadUrlResponse.status}`;
                    results.b2_upload_url.error = errorText;
                    console.error("Upload URL request failed:", errorText);
                } else {
                    const uploadUrlData = await uploadUrlResponse.json();
                    results.b2_upload_url.status = "✅ Success";
                    results.b2_upload_url.upload_url = uploadUrlData.uploadUrl;
                    results.b2_upload_url.auth_token_length =
                        uploadUrlData.authorizationToken
                            ? uploadUrlData.authorizationToken.length
                            : 0;
                    console.log(
                        "Upload URL request successful:",
                        uploadUrlData
                    );
                }
            }
        } catch (error) {
            results.b2_auth.status = `❌ Error: ${error.message}`;
            console.error("B2 test error:", error);
        }

        res.status(200).json(results);
    } catch (error) {
        console.error("Test error:", error);
        res.status(500).json({
            error: "Test failed",
            details: error.message,
        });
    }
}
