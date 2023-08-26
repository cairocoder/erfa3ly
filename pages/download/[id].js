import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    ProgressBar,
    Alert,
    Card,
} from "react-bootstrap";
import Header from "../../components/Header/Header";
import "bootstrap/dist/css/bootstrap.min.css";
import base64 from "base64-encode-decode";

export default function Download() {
    const router = useRouter();
    const { id } = router.query;
    const url = `https://f002.backblazeb2.com/file/erfa3ly/${base64.base64Decode(
        String(id)
    )}`;
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
                            <Card.Body className="text-center">
                                <Image
                                    src="/ready.gif"
                                    alt="ready"
                                    width={210}
                                    height={210}
                                />
                            </Card.Body>
                            <Card.Footer className="p-3">
                                <Form.Group className="m-0">
                                    <Button
                                        download="download"
                                        href={url}
                                        variant="success"
                                        className="w-100"
                                    >
                                        Download
                                    </Button>
                                </Form.Group>
                            </Card.Footer>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}
