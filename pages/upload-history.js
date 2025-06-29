import { useState, useEffect } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Button,
    Badge,
    Alert,
    Spinner,
} from "react-bootstrap";
import Header from "../components/Header/Header";
import "bootstrap/dist/css/bootstrap.min.css";
import base64 from "base64-encode-decode";

export default function UploadHistory() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [uploads, setUploads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/auth/signin");
            return;
        }

        fetchUploads();
    }, [session, status, router]);

    const fetchUploads = async () => {
        try {
            const response = await fetch("/api/uploads", {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const data = await response.json();
                setUploads(data.uploads || []);
            } else {
                const errorData = await response.json();
                setError(errorData.error || "Failed to load uploads");
            }
        } catch (error) {
            console.error("Error fetching uploads:", error);
            setError("An error occurred while loading uploads");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("Link copied to clipboard!");
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    const shareFile = async (filename) => {
        const shareUrl = `https://erfa3ly.com/download/${base64.base64Encode(
            filename
        )}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Shared File",
                    text: "Check out this file I shared with you",
                    url: shareUrl,
                });
            } catch (error) {
                console.error("Error sharing:", error);
            }
        } else {
            copyToClipboard(shareUrl);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (status === "loading" || loading) {
        return (
            <>
                <Header />
                <Container className="mt-5">
                    <div className="text-center">
                        <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </Spinner>
                    </div>
                </Container>
            </>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row>
                    <Col>
                        <Card>
                            <Card.Header className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">Upload History</h5>
                                <Badge bg="primary">
                                    {uploads.length} files
                                </Badge>
                            </Card.Header>
                            <Card.Body>
                                {error && (
                                    <Alert variant="danger">{error}</Alert>
                                )}

                                {uploads.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">
                                            No files uploaded yet.
                                        </p>
                                        <Button variant="primary" href="/">
                                            Upload Your First File
                                        </Button>
                                    </div>
                                ) : (
                                    <Table responsive>
                                        <thead>
                                            <tr>
                                                <th>File Name</th>
                                                <th>Size</th>
                                                <th>Uploaded</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {uploads.map((upload, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div>
                                                            <strong>
                                                                {
                                                                    upload.originalName
                                                                }
                                                            </strong>
                                                            <br />
                                                            <small className="text-muted">
                                                                {
                                                                    upload.filename
                                                                }
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {getFileSize(
                                                            upload.size || 0
                                                        )}
                                                    </td>
                                                    <td>
                                                        {formatDate(
                                                            upload.uploadedAt
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div
                                                            className="btn-group"
                                                            role="group"
                                                        >
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    copyToClipboard(
                                                                        `https://erfa3ly.com/download/${base64.base64Encode(
                                                                            upload.filename
                                                                        )}`
                                                                    )
                                                                }
                                                            >
                                                                Copy
                                                            </Button>
                                                            <Button
                                                                variant="outline-success"
                                                                size="sm"
                                                                onClick={() =>
                                                                    shareFile(
                                                                        upload.filename
                                                                    )
                                                                }
                                                            >
                                                                Share
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export async function getServerSideProps(context) {
    const session = await getSession(context);

    if (!session) {
        return {
            redirect: {
                destination: "/auth/signin",
                permanent: false,
            },
        };
    }

    return {
        props: {},
    };
}
