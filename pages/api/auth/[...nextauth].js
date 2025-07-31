import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "../../../lib/mongodb";
import bcrypt from "bcrypt";

export const authOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                // Here you would typically check against your database
                // For now, we'll use a simple check
                const { email, password } = credentials;

                // This is a placeholder - you'll need to implement proper user lookup
                // const user = await findUserByEmail(email);
                // if (!user || !await bcrypt.compare(password, user.password)) {
                //   throw new Error("Invalid credentials");
                // }

                // For demo purposes, allow any email/password
                return {
                    id: "1",
                    email: email,
                    name: email.split("@")[0],
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
            }
            return session;
        },
        async signIn({ user, account, profile, email, credentials }) {
            // Allow sign in if:
            // 1. User is signing in with credentials (email/password)
            // 2. User is signing in with Google and no existing account with same email
            // 3. User is signing in with Google and existing account is also Google
            if (account?.provider === "credentials") {
                return true;
            }

            if (account?.provider === "google") {
                // For Google OAuth, we'll allow all sign-ins for now
                // In production, you might want to check if the email domain is allowed
                return true;
            }

            return true;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
    pages: {
        signIn: "/auth/signin",
        signUp: "/auth/signup",
        error: "/auth/signin", // Redirect to signin page on error
    },
    debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
