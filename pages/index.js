import { useState, useEffect } from "react";
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

    channel.subscribe("progress", function (res) {
        setProgress(res.data.percent);
    });

    channel.subscribe("fieldId", function (res) {
        setFieldId(res.data);
    });

    useEffect(() => {
        set_document(document);
    }, []);

    const handleCancel = async () => {
        // Send a cancel request to the server
        await fetch("/api/upload", {
            method: "DELETE",
        }).then(() => window.location.reload());

        setProgress(-1);
    };

    const submitHandler = async (e) => {
        e.preventDefault(); //prevent the form from submitting

        document.getElementById("upload").disabled = true;
        document.getElementById("file").disabled = true;

        let formData = new FormData();
        formData.append("file", selectedFiles[0]);

        //Clear the error message
        setError("");
        await fetch("/api/upload", {
            method: "POST",
            body: formData,
        })
            .then((res) => res.json())
            .then((res) => setFilename(base64.base64Encode(res.url)));
        // console.log(filename);
    };

    const ClipboardCopy = () => {
        navigator.clipboard
            .writeText(`https://erfa3ly.com/download/${filename}`)
            .then(
                (success) => console.log("text copied"),
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
                                    {!error && progress >= 100 && filename && (
                                        <Image
                                            src="/tick-gif.gif"
                                            width={210}
                                            height={210}
                                            alt="successful"
                                            className="img-fluid"
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
                                            />
                                        )}
                                    {progress < 100 && !filename && (
                                        <Form.Group>
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
                                            >
                                                Upload
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
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        {!error &&
                                            progress >= 100 &&
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
