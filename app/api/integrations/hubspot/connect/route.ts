import { NextResponse } from "next/server";
import { auth } from "@/auth";

// ── GET /api/integrations/hubspot/connect ─────────────────────────────────────
// Redirects the authenticated user to HubSpot's OAuth authorization page.

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "HubSpot integration not configured" }, { status: 503 });
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/integrations/hubspot/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "crm.objects.contacts.read crm.objects.deals.read",
  });

  return NextResponse.redirect(
    `https://app.hubspot.com/oauth/authorize?${params.toString()}`
  );
}
