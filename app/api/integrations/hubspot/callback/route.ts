import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";

// ── GET /api/integrations/hubspot/callback ────────────────────────────────────
// Handles HubSpot OAuth callback: exchanges code for tokens and stores them
// in user_integrations. Redirects back to /profile?hubspot=ok on success.

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/profile?hubspot=error`);
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/profile?hubspot=error`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/integrations/hubspot/callback`,
        code,
      }).toString(),
    });

    if (!tokenRes.ok) {
      console.error("[hubspot/callback] token exchange failed", await tokenRes.text());
      return NextResponse.redirect(`${baseUrl}/profile?hubspot=error`);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Fetch HubSpot portal info for metadata
    let portalId: string | null = null;
    try {
      const meRes = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
      if (meRes.ok) {
        const me = await meRes.json() as { hub_id?: number };
        portalId = me.hub_id ? String(me.hub_id) : null;
      }
    } catch {
      // non-critical — continue without portal ID
    }

    // Store tokens in user_integrations
    await supabase.from("user_integrations").upsert(
      {
        user_id: userId,
        provider: "hubspot",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        metadata: { portal_id: portalId },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    return NextResponse.redirect(`${baseUrl}/profile?hubspot=ok`);
  } catch (err) {
    console.error("[hubspot/callback] error:", err);
    return NextResponse.redirect(`${baseUrl}/profile?hubspot=error`);
  }
}
