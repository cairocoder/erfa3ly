export default function handler(req, res) {
    if (req.method === "GET") {
        return res.status(200).json({
            message: "Test endpoint working",
            method: req.method,
            url: req.url,
        });
    }

    if (req.method === "POST") {
        return res.status(200).json({
            message: "POST method working",
            body: req.body,
        });
    }

    return res.status(405).json({ error: "Method not allowed" });
}
