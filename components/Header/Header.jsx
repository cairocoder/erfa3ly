import React, { useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Navbar, Nav, Button } from 'react-bootstrap';
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
                            <div className={`dropdown ${styles.profileDropdown}`}>
                                <button 
                                    className="btn btn-link dropdown-toggle d-flex align-items-center" 
                                    type="button" 
                                    id="profileDropdown" 
                                    data-bs-toggle="dropdown" 
                                    aria-expanded="false"
                                >
                                    <Image 
                                        src={session.user?.image || "/default-avatar.svg"} 
                                        alt="Profile" 
                                        width={32} 
                                        height={32} 
                                        className="rounded-circle me-2"
                                    />
                                    <span className={styles.userName}>{session.user?.name || session.user?.email}</span>
                                </button>
                                <ul className="dropdown-menu" aria-labelledby="profileDropdown">
                                    <li><Link href="/profile" className="dropdown-item">Profile</Link></li>
                                    <li><Link href="/upload-history" className="dropdown-item">Upload History</Link></li>
                                    <li><hr className="dropdown-divider" /></li>
                                    <li><button className="dropdown-item" onClick={handleSignOut}>Sign Out</button></li>
                                </ul>
                            </div>
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