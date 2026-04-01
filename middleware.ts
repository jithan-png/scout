import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  // Protect personalized pages — /working, /setup, /opportunities open to all (value first)
  matcher: [
    "/scout/:path*",
    "/activity/:path*",
    "/profile/:path*",
  ],
};
