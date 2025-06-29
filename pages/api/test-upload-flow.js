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

        console.log("Testing complete upload flow...");

        // Step 1: Test getting upload URL
        console.log("Step 1: Getting upload URL...");
        const urlResponse = await fetch(
            `${
                process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/get-upload-url`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: req.headers.cookie || "",
                },
                body: JSON.stringify({
                    filename: "test-file.txt",
                    contentType: "text/plain",
                    fileSize: 1024,
                }),
            }
        );

        if (!urlResponse.ok) {
            const errorText = await urlResponse.text();
            console.error("Failed to get upload URL:", errorText);
            return res.status(500).json({
                error: "Failed to get upload URL",
                status: urlResponse.status,
                details: errorText,
            });
        }

        const urlData = await urlResponse.json();
        console.log("Upload URL obtained successfully:", {
            uploadUrl: urlData.uploadUrl,
            uploadId: urlData.uploadId,
        });

        // Step 2: Test uploading a small file
        console.log("Step 2: Testing file upload...");
        const testContent = "This is a test file for upload verification.";
        const testBuffer = Buffer.from(testContent, "utf-8");

        // Calculate SHA1 hash
        const crypto = require("crypto");
        const sha1Hash = crypto
            .createHash("sha1")
            .update(testBuffer)
            .digest("hex");

        const uploadResponse = await fetch(urlData.uploadUrl, {
            method: "POST",
            headers: {
                Authorization: urlData.authorizationToken,
                "Content-Type": "text/plain",
                "Content-Length": testBuffer.length.toString(),
                "X-Bz-File-Name": "test-file.txt",
                "X-Bz-Content-Sha1": sha1Hash,
            },
            body: testBuffer,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("Upload failed:", errorText);
            return res.status(500).json({
                error: "Upload failed",
                status: uploadResponse.status,
                details: errorText,
            });
        }

        const uploadResult = await uploadResponse.json();
        console.log("Upload successful:", uploadResult);

        // Step 3: Test completing the upload
        console.log("Step 3: Completing upload...");
        const completeResponse = await fetch(
            `${
                process.env.NEXTAUTH_URL || "http://localhost:3000"
            }/api/complete-upload`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: req.headers.cookie || "",
                },
                body: JSON.stringify({
                    uploadId: urlData.uploadId,
                    fileId: uploadResult.fileId,
                    filename: "test-file.txt",
                    originalName: "test-file.txt",
                    fileSize: testBuffer.length,
                    contentType: "text/plain",
                }),
            }
        );

        if (!completeResponse.ok) {
            const errorText = await completeResponse.text();
            console.error("Failed to complete upload:", errorText);
            return res.status(500).json({
                error: "Failed to complete upload",
                status: completeResponse.status,
                details: errorText,
            });
        }

        const completeResult = await completeResponse.json();
        console.log("Upload completion successful:", completeResult);

        res.status(200).json({
            success: true,
            message: "Complete upload flow test successful",
            steps: {
                step1: "✅ Upload URL obtained",
                step2: "✅ File uploaded to B2",
                step3: "✅ Upload completed in database",
            },
            data: {
                uploadId: urlData.uploadId,
                fileId: uploadResult.fileId,
                downloadUrl: completeResult.downloadUrl,
            },
        });
    } catch (error) {
        console.error("Upload flow test error:", error);
        res.status(500).json({
            error: "Upload flow test failed",
            details: error.message,
        });
    }
}
