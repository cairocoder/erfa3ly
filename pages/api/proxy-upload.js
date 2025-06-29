import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import formidable from "formidable";

export const config = {
    api: {
        bodyParser: false,
        responseLimit: false,
    },
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

        // Parse multipart form data
        const form = new formidable.IncomingForm({
            maxFileSize: 10_000_000_000, // 10GB
            maxFields: 10,
            allowEmptyFiles: false,
        });

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve({ fields, files });
            });
        });

        const {
            uploadUrl,
            authorizationToken,
            filename,
            contentType,
            sha1Hash,
        } = fields;
        const file = files.file;

        if (
            !uploadUrl ||
            !authorizationToken ||
            !filename ||
            !contentType ||
            !sha1Hash ||
            !file
        ) {
            return res
                .status(400)
                .json({ error: "Missing required parameters" });
        }

        // Read the file
        const fs = require("fs");
        const fileBuffer = fs.readFileSync(file.filepath);

        console.log(
            `Proxying upload to B2: ${filename}, size: ${fileBuffer.length} bytes`
        );

        // Upload to B2 through our server
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                Authorization: authorizationToken,
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
                "X-Bz-File-Name": filename,
                "X-Bz-Content-Sha1": sha1Hash,
            },
            body: fileBuffer,
        });

        console.log(`B2 upload response status: ${uploadResponse.status}`);

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(
                `B2 upload failed: ${uploadResponse.status} - ${errorText}`
            );
            throw new Error(
                `B2 upload failed: ${uploadResponse.status} - ${errorText}`
            );
        }

        const uploadResult = await uploadResponse.json();
        console.log("B2 upload successful:", uploadResult);

        res.status(200).json(uploadResult);
    } catch (error) {
        console.error("Proxy upload error:", error);
        res.status(500).json({
            error: "Failed to proxy upload",
            details: error.message,
        });
    }
}
