import React, { useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';
import styles from "./Header.module.css";

const Header = () => {
    const { data: session, status } = useSession();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    return (
        <Navbar bg="light" expand="lg" className="border-bottom">
            <div className="container">
                <Link href="/" className="navbar-brand">
                    <Image src="/logo.png" alt="logo" width={175} height={50} />
                </Link>
                
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {/* Navigation links removed */}
                    </Nav>
                    
                    <Nav className="ms-auto">
                        {status === "loading" ? (
                            <div className="d-flex align-items-center">
                                <div className="spinner-border spinner-border-sm me-2" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : session ? (
                            <NavDropdown 
                                title={
                                    <div className="d-flex align-items-center">
                                        <Image 
                                            src={session.user?.image || "/default-avatar.svg"} 
                                            alt="Profile" 
                                            width={32} 
                                            height={32} 
                                            className="rounded-circle me-2"
                                        />
                                        <span>{session.user?.name || session.user?.email}</span>
                                    </div>
                                } 
                                id="basic-nav-dropdown"
                            >
                                <Link href="/profile" className="dropdown-item">
                                    Profile
                                </Link>
                                <Link href="/upload-history" className="dropdown-item">
                                    Upload History
                                </Link>
                                <NavDropdown.Divider />
                                <NavDropdown.Item onClick={handleSignOut}>
                                    Sign Out
                                </NavDropdown.Item>
                            </NavDropdown>
                        ) : (
                            <div className="d-flex gap-2">
                                <Link href="/auth/signin">
                                    <Button variant="outline-primary" size="sm">
                                        Sign In
                                    </Button>
                                </Link>
                                <Link href="/auth/signup">
                                    <Button variant="primary" size="sm">
                                        Sign Up
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </Nav>
                </Navbar.Collapse>
            </div>
        </Navbar>
    );
};

export default Header;