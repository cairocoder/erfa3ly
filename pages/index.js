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
// import bcrypt from "bcrypt";
import Ably from "ably";
import Image from "next/image";
import ProgressBar from "react-customizable-progressbar";
import { extname } from "path";

const ably = new Ably.Realtime(
    "LObVIA.-Xrj3A:IGVxQ6RDqWeKj7bFnzILx1Mt3qTMKL-rh43QiJxWP8s"
);

const channel = ably.channels.get("test");

export default function Home() {
    const [_document, set_document] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState(null);
    const [progress, setProgress] = useState(-1);
    const [fieldId, setFieldId] = useState();
    const [error, setError] = useState();
    const [filename, setFilename] = useState();
    const [isUploading, setIsUploading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [uploadCompleted, setUploadCompleted] = useState(false);
    const [uploadTrulyCompleted, setUploadTrulyCompleted] = useState(false);

    // Refs for cleanup
    const abortControllerRef = useRef(null);
    const progressSubscriptionRef = useRef(null);
    const fieldIdSubscriptionRef = useRef(null);
    const uploadCompletedRef = useRef(false);

    // Check for pending uploads on page load and cancel them
    useEffect(() => {
        const checkPendingUploads = async () => {
            const pendingUploadId = sessionStorage.getItem("pendingUploadId");
            const pendingFieldId = sessionStorage.getItem("pendingFieldId");

            if (pendingUploadId && pendingFieldId) {
                console.log("Found pending upload, cancelling...");
                try {
                    await fetch("/api/upload", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ fieldId: pendingFieldId }),
                    });
                } catch (error) {
                    console.error("Error cancelling pending upload:", error);
                } finally {
                    // Clear the pending upload from sessionStorage
                    sessionStorage.removeItem("pendingUploadId");
                    sessionStorage.removeItem("pendingFieldId");
                }
            }
        };

        checkPendingUploads();
    }, []);

    // Subscribe to progress updates
    useEffect(() => {
        progressSubscriptionRef.current = channel.subscribe(
            "progress",
            function (res) {
                setProgress(res.data.percent);
            }
        );

        fieldIdSubscriptionRef.current = channel.subscribe(
            "fieldId",
            function (res) {
                setFieldId(res.data);
                // Store the fieldId in sessionStorage for potential cancellation
                sessionStorage.setItem("pendingFieldId", res.data);
            }
        );

        // Cleanup subscriptions on unmount
        return () => {
            if (progressSubscriptionRef.current) {
                progressSubscriptionRef.current.unsubscribe();
            }
            if (fieldIdSubscriptionRef.current) {
                fieldIdSubscriptionRef.current.unsubscribe();
            }
        };
    }, []);

    // Auto-cancel upload on page refresh/unmount - but only if upload is still in progress
    useEffect(() => {
        console.log(
            "Auto-cancellation useEffect - isUploading:",
            isUploading,
            "fieldId:",
            fieldId,
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
                fieldId &&
                !uploadCompleted &&
                !uploadTrulyCompleted &&
                !uploadCompletedRef.current
            ) {
                console.log(
                    "Storing upload info for cancellation on page unload"
                );
                // Store upload info for cancellation on next page load
                sessionStorage.setItem(
                    "pendingUploadId",
                    Date.now().toString()
                );
                sessionStorage.setItem("pendingFieldId", fieldId);
            } else {
                console.log(
                    "Skipping cancellation on beforeunload - conditions not met"
                );
            }
        };

        const handleVisibilityChange = () => {
            console.log(
                "visibilitychange event triggered - state:",
                document.visibilityState
            );
            if (
                document.visibilityState === "hidden" &&
                isUploading &&
                fieldId &&
                !uploadCompleted &&
                !uploadTrulyCompleted &&
                !uploadCompletedRef.current
            ) {
                console.log(
                    "Storing upload info for cancellation on visibility change"
                );
                // Store upload info for cancellation
                sessionStorage.setItem(
                    "pendingUploadId",
                    Date.now().toString()
                );
                sessionStorage.setItem("pendingFieldId", fieldId);
            } else {
                console.log(
                    "Skipping cancellation on visibility change - conditions not met"
                );
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            console.log(
                "Cleanup function called for auto-cancellation useEffect"
            );
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );

            // Cancel upload if component unmounts while uploading and not completed
            if (
                isUploading &&
                fieldId &&
                !uploadCompleted &&
                !uploadTrulyCompleted &&
                !uploadCompletedRef.current
            ) {
                console.log("Component unmounting - cancelling upload");
                handleCancel();
            } else {
                console.log(
                    "Skipping cancellation on unmount - conditions not met"
                );
            }
        };
    }, [isUploading, fieldId, uploadCompleted, uploadTrulyCompleted]);

    useEffect(() => {
        set_document(document);
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
                "Sending cancel request to server with fieldId:",
                fieldId
            );
            const response = await fetch("/api/upload", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ fieldId }),
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
            setFieldId(null);
            setIsUploading(false);
            setIsCancelling(false);
            setSelectedFiles(null);
            setUploadCompleted(false);
            setUploadTrulyCompleted(false);
            uploadCompletedRef.current = false;

            // Clear sessionStorage
            sessionStorage.removeItem("pendingUploadId");
            sessionStorage.removeItem("pendingFieldId");

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
        setFieldId(null);
        setError("");
        setIsUploading(false);
        setIsCancelling(false);
        setUploadCompleted(false);
        setUploadTrulyCompleted(false);
        uploadCompletedRef.current = false;
        setFilename(null);

        // Clear sessionStorage
        sessionStorage.removeItem("pendingUploadId");
        sessionStorage.removeItem("pendingFieldId");

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

        // Store upload info in sessionStorage
        const uploadId = Date.now().toString();
        sessionStorage.setItem("pendingUploadId", uploadId);

        try {
            // Use direct upload to Backblaze B2 for all files
            const file = selectedFiles[0];
            await uploadFile(file);
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

    const uploadFile = async (file) => {
        try {
            console.log("Starting server-side upload for:", file.name);

            // Create FormData for file upload
            const formData = new FormData();
            formData.append("file", file);

            // Upload through our server to avoid CORS issues
            const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                signal: abortControllerRef.current.signal,
            });

            console.log("Upload response status:", uploadResponse.status);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error("Upload error response:", errorText);
                throw new Error(
                    `Upload failed: ${uploadResponse.status} - ${errorText}`
                );
            }

            const uploadResult = await uploadResponse.json();
            console.log("Upload result:", uploadResult);

            // Set success states
            console.log("Upload completed successfully, setting states...");
            setFilename(uploadResult.filename);
            setProgress(100);
            setUploadCompleted(true);
            setUploadTrulyCompleted(true);
            uploadCompletedRef.current = true;

            // Clear sessionStorage on successful upload
            sessionStorage.removeItem("pendingUploadId");
            sessionStorage.removeItem("pendingFieldId");
        } catch (error) {
            if (error.name === "AbortError") {
                console.log("Upload was cancelled");
            } else {
                console.error("Upload error:", error);
                setError(error.message || "Upload failed. Please try again.");
            }
        }
    };

    // Helper function to calculate SHA1 hash
    const calculateSha1 = async (file) => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest("SHA-1", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        return hashHex;
    };

    const ClipboardCopy = () => {
        navigator.clipboard
            .writeText(`https://erfa3ly.com/download/${filename}`)
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
                                        <Form.Group>
                                            <Form.Control
                                                type="file"
                                                id="file"
                                                label="Select a File"
                                                name="file"
                                                onChange={(e) => {
                                                    const file =
                                                        e.target.files[0];
                                                    if (file) {
                                                        setError("");
                                                        setSelectedFiles(
                                                            e.target.files
                                                        );
                                                    }
                                                }}
                                            />
                                            <Form.Text className="text-muted">
                                                Maximum file size: 5GB (standard
                                                files) or 10TB (large files)
                                            </Form.Text>
                                        </Form.Group>
                                    )}
                                    {error && (
                                        <Alert variant="danger">{error}</Alert>
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
