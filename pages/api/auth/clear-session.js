import { getSession } from "next-auth/react";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Clear the session cookie
        res.setHeader(
            "Set-Cookie",
            "next-auth.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
        );

        return res
            .status(200)
            .json({ message: "Session cleared successfully" });
    } catch (error) {
        console.error("Error clearing session:", error);
        return res.status(500).json({ error: "Failed to clear session" });
    }
}
