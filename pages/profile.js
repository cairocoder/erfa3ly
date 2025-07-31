import { useState, useEffect } from "react";
import { useSession, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Container, Row, Col, Card } from "react-bootstrap";
import Header from "../components/Header/Header";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Profile() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;

        if (!session) {
            router.push("/auth/signin");
            return;
        }
    }, [session, status, router]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (status === "loading") {
        return (
            <>
                <Header />
                <Container>
                    <Row className="mt-5">
                        <Col className="text-center">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">
                                    Loading...
                                </span>
                            </div>
                        </Col>
                    </Row>
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
            <Container>
                <Row className="mt-5">
                    <Col lg={{ span: 6, offset: 3 }}>
                        <Card>
                            <Card.Header>
                                <h4 className="mb-0">Profile</h4>
                            </Card.Header>
                            <Card.Body>
                                <div className="text-center mb-3">
                                    <Image
                                        src={
                                            session.user?.image ||
                                            "/default-avatar.png"
                                        }
                                        alt="Profile"
                                        className="rounded-circle"
                                        width={100}
                                        height={100}
                                    />
                                </div>
                                <h6 className="text-center">
                                    {session.user?.name}
                                </h6>
                                <p className="text-center text-muted">
                                    {session.user?.email}
                                </p>

                                <div className="mt-3">
                                    <small className="text-muted">
                                        Member since:{" "}
                                        {formatDate(
                                            session.user?.createdAt ||
                                                new Date()
                                        )}
                                    </small>
                                </div>
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
