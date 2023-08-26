import React from "react";
import Image from 'next/image';
import Link from 'next/link';
// import { ReactComponent as Logo } from './logo.svg';
import logo from './logo.png';
import "./Header.module.css";

const Header = () => {
    return (
        <nav className="py-2 bg-light border-bottom" id="navbarText">
            <div className="container d-flex flex-wrap align-items-center py-2">
                <div className="col-6 nav justify-content-start">
                    <Link href="/" passHref>
                        <a>
                            <Image src={logo} alt="logo" width={175} height={50} />
                        </a>
                    </Link>
                </div>
                <div className="col-6 nav justify-content-end">
                    {/* <ul className="nav">
                        <li className="nav-item"><a href="#" className="nav-link link-dark px-2">Login</a></li>
                        <li className="nav-item"><a href="#" className="nav-link link-dark px-2">Sign up</a></li>
                    </ul> */}
                        <Image src="/beta.png" alt="logo" width={100} height={70} />
                </div>
            </div>
        </nav>
    )
}

export default Header;