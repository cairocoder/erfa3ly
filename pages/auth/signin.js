import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    Alert,
    Card,
} from "react-bootstrap";
import Header from "../../components/Header/Header";
import "bootstrap/dist/css/bootstrap.min.css";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Handle error from URL parameters
    useEffect(() => {
        if (router.query.error) {
            switch (router.query.error) {
                case "OAuthAccountNotLinked":
                    setError(
                        "An account with this email already exists. Please sign in with your original method (email/password or Google)."
                    );
                    break;
                case "Callback":
                    setError(
                        "There was an error with the authentication provider. Please try again."
                    );
                    break;
                case "Configuration":
                    setError(
                        "There is a problem with the server configuration. Please contact support."
                    );
                    break;
                case "AccessDenied":
                    setError("Access denied. Please try again.");
                    break;
                case "Verification":
                    setError(
                        "The verification token has expired or has already been used."
                    );
                    break;
                default:
                    setError(
                        "An error occurred during sign in. Please try again."
                    );
            }
        }
    }, [router.query.error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid credentials");
            } else {
                router.push("/");
            }
        } catch (error) {
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl: "/" });
    };

    return (
        <>
            <Header />
            <Container>
                <Row className="justify-content-center mt-5">
                    <Col md={6} lg={4}>
                        <Card>
                            <Card.Header>
                                <h4 className="text-center mb-0">Sign In</h4>
                            </Card.Header>
                            <Card.Body>
                                {error && (
                                    <Alert variant="danger">{error}</Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email</Form.Label>
                                        <Form.Control
                                            type="email"
                                            value={email}
                                            onChange={(e) =>
                                                setEmail(e.target.value)
                                            }
                                            required
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            required
                                        />
                                    </Form.Group>

                                    <Button
                                        variant="primary"
                                        type="submit"
                                        className="w-100 mb-3"
                                        disabled={isLoading}
                                    >
                                        {isLoading
                                            ? "Signing In..."
                                            : "Sign In"}
                                    </Button>
                                </Form>

                                <div className="text-center mb-3">
                                    <span className="text-muted">or</span>
                                </div>

                                <Button
                                    variant="outline-dark"
                                    className="w-100 mb-3"
                                    onClick={handleGoogleSignIn}
                                >
                                    <svg
                                        className="me-2"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </Button>

                                <div className="text-center">
                                    <p className="mb-0">
                                        Don&apos;t have an account?{" "}
                                        <Link href="/auth/signup">Sign up</Link>
                                    </p>
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

    if (session) {
        return {
            redirect: {
                destination: "/",
                permanent: false,
            },
        };
    }

    return {
        props: {},
    };
}
