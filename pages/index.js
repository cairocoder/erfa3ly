import { useState, useEffect, useRef } from "react";
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    Alert,
    Card,
} from "react-bootstrap";
import Header from "../components/Header/Header";
import "bootstrap/dist/css/bootstrap.min.css";
import base64 from "base64-encode-decode";
import Image from "next/image";
import ProgressBar from "react-customizable-progressbar";

export default function Home() {
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [progress, setProgress] = useState(-1);
    const [uploadId, setUploadId] = useState(null);
    const [error, setError] = useState();
    const [filename, setFilename] = useState();
    const [isUploading, setIsUploading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [uploadCompleted, setUploadCompleted] = useState(false);
    const [uploadTrulyCompleted, setUploadTrulyCompleted] = useState(false);

    // Refs for cleanup
    const abortControllerRef = useRef(null);
    const progressIntervalRef = useRef(null);
    const uploadCompletedRef = useRef(false);

    // Check for pending uploads on page load and cancel them
    useEffect(() => {
        const checkPendingUploads = async () => {
            const pendingUploadId = sessionStorage.getItem("pendingUploadId");

            if (pendingUploadId) {
                console.log("Found pending upload, cancelling...");
                try {
                    await fetch("/api/upload-contabo", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ uploadId: pendingUploadId }),
                    });
                } catch (error) {
                    console.error("Error cancelling pending upload:", error);
                } finally {
                    // Clear the pending upload from sessionStorage
                    sessionStorage.removeItem("pendingUploadId");
                }
            }
        };

        checkPendingUploads();
    }, []);

    // Poll for progress updates when upload is in progress
    useEffect(() => {
        if (uploadId && isUploading && !uploadCompleted) {
            progressIntervalRef.current = setInterval(async () => {
                try {
                    const response = await fetch(
                        `/api/upload-contabo?uploadId=${uploadId}&t=${Date.now()}`,
                        {
                            headers: {
                                "Cache-Control": "no-cache",
                                Pragma: "no-cache",
                            },
                        }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        console.log(
                            `Received progress for uploadId ${uploadId}: ${data.progress}%`
                        );
                        setProgress(data.progress);

                        if (data.progress >= 100) {
                            console.log(
                                `Upload completed for uploadId ${uploadId}`
                            );
                            setUploadCompleted(true);
                            setUploadTrulyCompleted(true);
                            uploadCompletedRef.current = true;
                            clearInterval(progressIntervalRef.current);
                        }
                    } else {
                        console.log(
                            `Progress request failed: ${response.status}`
                        );
                    }
                } catch (error) {
                    console.error("Error fetching progress:", error);
                }
            }, 500); // Poll every 500ms
        }

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [uploadId, isUploading, uploadCompleted]);

    // Auto-cancel upload on page refresh/unmount - but only if upload is still in progress
    useEffect(() => {
        console.log(
            "Auto-cancellation useEffect - isUploading:",
            isUploading,
            "uploadId:",
            uploadId,
            "uploadCompleted:",
            uploadCompleted,
            "uploadTrulyCompleted:",
            uploadTrulyCompleted,
            "uploadCompletedRef:",
            uploadCompletedRef.current
        );

        const handleBeforeUnload = () => {
            console.log("beforeunload event triggered");
            if (
                isUploading &&
                uploadId &&
                !uploadCompleted &&
                !uploadTrulyCompleted &&
                !uploadCompletedRef.current
            ) {
                console.log(
                    "Storing upload info for cancellation on page unload"
                );
                // Store upload info for cancellation on next page load
                sessionStorage.setItem("pendingUploadId", uploadId);
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log(
                    "Page hidden, checking if we need to store upload info"
                );
                if (
                    isUploading &&
                    uploadId &&
                    !uploadCompleted &&
                    !uploadTrulyCompleted &&
                    !uploadCompletedRef.current
                ) {
                    console.log(
                        "Page hidden, storing upload info for potential cancellation"
                    );
                    sessionStorage.setItem("pendingUploadId", uploadId);
                }
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [isUploading, uploadId, uploadCompleted, uploadTrulyCompleted]);

    useEffect(() => {
        // set_document(document); // This line is removed as per the edit hint
    }, []);

    const handleCancel = async () => {
        console.log(
            "handleCancel called - isUploading:",
            isUploading,
            "isCancelling:",
            isCancelling,
            "uploadCompleted:",
            uploadCompleted,
            "uploadTrulyCompleted:",
            uploadTrulyCompleted,
            "uploadCompletedRef:",
            uploadCompletedRef.current
        );

        if (
            !isUploading ||
            isCancelling ||
            uploadCompleted ||
            uploadTrulyCompleted ||
            uploadCompletedRef.current
        ) {
            console.log("handleCancel early return - conditions not met");
            return;
        }

        console.log("Starting cancellation process...");
        setIsCancelling(true);

        try {
            // Abort the current fetch request if it exists
            if (abortControllerRef.current) {
                console.log("Aborting fetch request...");
                abortControllerRef.current.abort();
            }

            // Send a cancel request to the server
            console.log(
                "Sending cancel request to server with uploadId:",
                uploadId
            );
            const response = await fetch("/api/upload-contabo", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ uploadId }),
            });

            if (response.ok) {
                console.log("Upload cancelled successfully");
            } else {
                console.log("Cancel request failed:", response.status);
            }
        } catch (error) {
            console.error("Error cancelling upload:", error);
        } finally {
            console.log("Resetting states after cancellation...");
            // Reset states
            setProgress(-1);
            setUploadId(null);
            setIsUploading(false);
            setIsCancelling(false);
            setSelectedFiles(null);
            setUploadCompleted(false);
            setUploadTrulyCompleted(false);
            uploadCompletedRef.current = false;

            // Clear sessionStorage
            sessionStorage.removeItem("pendingUploadId");

            // Re-enable form elements
            const uploadBtn = document.getElementById("upload");
            const fileInput = document.getElementById("file");
            if (uploadBtn) uploadBtn.disabled = false;
            if (fileInput) fileInput.disabled = false;
        }
    };

    const resetForm = () => {
        setSelectedFiles(null);
        setProgress(-1);
        setUploadId(null);
        setError("");
        setIsUploading(false);
        setIsCancelling(false);
        setUploadCompleted(false);
        setUploadTrulyCompleted(false);
        uploadCompletedRef.current = false;
        setFilename(null);

        // Clear sessionStorage
        sessionStorage.removeItem("pendingUploadId");

        // Re-enable form elements
        const uploadBtn = document.getElementById("upload");
        const fileInput = document.getElementById("file");
        if (uploadBtn) uploadBtn.disabled = false;
        if (fileInput) fileInput.disabled = false;
    };

    const submitHandler = async (e) => {
        e.preventDefault(); //prevent the form from submitting

        if (!selectedFiles || selectedFiles.length === 0) {
            setError("Please select a file first");
            return;
        }

        document.getElementById("upload").disabled = true;
        document.getElementById("file").disabled = true;

        setIsUploading(true);
        setError("");
        setProgress(0);
        setUploadCompleted(false);
        setUploadTrulyCompleted(false);
        uploadCompletedRef.current = false;

        // Create new AbortController for this upload
        abortControllerRef.current = new AbortController();

        // Generate upload ID and store upload info
        const uploadId = Date.now().toString();
        setUploadId(uploadId);
        sessionStorage.setItem("pendingUploadId", uploadId);

        let formData = new FormData();
        formData.append("file", selectedFiles[0]);
        formData.append("uploadId", uploadId);

        try {
            const response = await fetch("/api/upload-contabo", {
                method: "POST",
                body: formData,
                signal: abortControllerRef.current.signal,
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Upload completed successfully, setting states...");
                setFilename(base64.base64Encode(result.url));
                setProgress(100);
                setUploadCompleted(true);
                setUploadTrulyCompleted(true);
                uploadCompletedRef.current = true;
                console.log(
                    "Upload states set - filename:",
                    base64.base64Encode(result.url),
                    "uploadCompleted: true",
                    "uploadTrulyCompleted: true"
                );

                // Clear sessionStorage on successful upload
                sessionStorage.removeItem("pendingUploadId");

                // Add a small delay to ensure state updates are processed
                setTimeout(() => {
                    console.log(
                        "State update delay completed - uploadTrulyCompleted should be true now"
                    );
                }, 100);
            } else {
                // Try to get the error message from the response
                try {
                    const errorData = await response.json();
                    setError(
                        errorData.error || `Upload failed: ${response.status}`
                    );
                } catch (parseError) {
                    setError(`Upload failed: ${response.status}`);
                }
                return; // Exit early without throwing
            }
        } catch (error) {
            if (error.name === "AbortError") {
                console.log("Upload was cancelled");
            } else {
                console.error("Upload error:", error);
                setError(error.message || "Upload failed. Please try again.");
            }
        } finally {
            console.log(
                "Upload process finished, setting isUploading to false"
            );
            setIsUploading(false);
            abortControllerRef.current = null;
        }
    };

    const ClipboardCopy = () => {
        navigator.clipboard
            .writeText(
                `https://erfa3ly.com/api/download-contabo?filename=${filename}`
            )
            .then(
                (success) => {
                    console.log("text copied");
                    alert("Link copied to clipboard!");
                },
                (err) => console.log("error copying text")
            );
    };

    return (
        <>
            <Header />
            <Container>
                <Row className="mt-5">
                    <Col lg={{ span: 4 }}>
                        <Card bg="light" text="dark" className="mb-2">
                            <Card.Header>
                                File sharing and storage made simple
                            </Card.Header>
                            {/* <Card.Title> Card Title </Card.Title> */}
                            <Form onSubmit={submitHandler}>
                                <Card.Body className="text-center">
                                    {!error && uploadCompleted && filename && (
                                        <Image
                                            src="/tick-gif.gif"
                                            width={210}
                                            height={210}
                                            alt="successful"
                                            className="img-fluid"
                                            unoptimized
                                        />
                                    )}
                                    {!error &&
                                        progress >= 0 &&
                                        progress < 100 && (
                                            <Image
                                                src="/running.gif"
                                                width={210}
                                                height={210}
                                                alt="successful"
                                                className="img-fluid"
                                                unoptimized
                                            />
                                        )}
                                    {progress < 100 && !uploadCompleted && (
                                        <Form.Group className="mb-3">
                                            <Form.Control
                                                type="file"
                                                id="file"
                                                label="Select a File"
                                                name="file"
                                                onChange={(e) => {
                                                    setSelectedFiles(
                                                        e.target.files
                                                    );
                                                }}
                                            />
                                            <small className="text-muted mt-1 d-block">
                                                Maximum file size: 1GB
                                            </small>
                                        </Form.Group>
                                    )}
                                    {error && (
                                        <div className="mb-3">
                                            <Alert
                                                variant="danger"
                                                className="mb-3"
                                            >
                                                {error}
                                            </Alert>
                                            <Button
                                                variant="primary"
                                                className="w-100"
                                                onClick={resetForm}
                                            >
                                                Upload Another File
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                                <Card.Footer className="p-3">
                                    <Form.Group className="m-0">
                                        {!error &&
                                            progress >= 0 &&
                                            progress < 100 && (
                                                <>
                                                    <ProgressBar
                                                        radius={100}
                                                        progress={progress}
                                                        steps={100}
                                                        cut={0}
                                                        rotate={-90}
                                                        strokeWidth={20}
                                                        strokeColor={"#C233FF"}
                                                        transition={".3s ease"}
                                                    >
                                                        <div className="indicator">
                                                            <div>
                                                                <b>
                                                                    {progress}%
                                                                </b>
                                                            </div>
                                                        </div>
                                                    </ProgressBar>
                                                </>
                                            )}
                                        {progress < 0 &&
                                        typeof window === "object" &&
                                        document.getElementById("file")?.files
                                            ?.length === 1 ? (
                                            <Button
                                                variant="success"
                                                type="submit"
                                                className="w-100"
                                                id="upload"
                                                disabled={isUploading}
                                            >
                                                {isUploading
                                                    ? "Uploading..."
                                                    : "Upload"}
                                            </Button>
                                        ) : (
                                            ""
                                        )}
                                        {!error &&
                                            progress >= 0 &&
                                            progress < 100 && (
                                                <Button
                                                    variant="danger"
                                                    type="button"
                                                    className="w-100 mt-2"
                                                    id="cancel"
                                                    onClick={handleCancel}
                                                    disabled={isCancelling}
                                                >
                                                    {isCancelling
                                                        ? "Cancelling..."
                                                        : "Cancel"}
                                                </Button>
                                            )}
                                        {!error &&
                                            uploadCompleted &&
                                            filename && (
                                                <Button
                                                    variant="primary"
                                                    className="w-100 mt-2"
                                                    id="copyButton"
                                                    onClick={ClipboardCopy}
                                                >
                                                    Copy Link
                                                </Button>
                                            )}
                                        {!error &&
                                            uploadCompleted &&
                                            filename && (
                                                <Button
                                                    variant="outline-secondary"
                                                    className="w-100 mt-2"
                                                    onClick={resetForm}
                                                >
                                                    Upload Another File
                                                </Button>
                                            )}
                                    </Form.Group>
                                </Card.Footer>
                            </Form>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}
