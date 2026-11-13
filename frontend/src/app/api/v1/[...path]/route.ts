import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const backend = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const secure = process.env.NODE_ENV === "production";
const cookieOptions = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: Context): Promise<NextResponse> {
  const { path } = await context.params;
  const pathName = path.join("/");
  const endpoint = `${backend}/api/v1/${pathName}${request.nextUrl.search}`;
  const jar = await cookies();
  const access = jar.get("care_access")?.value;
  const refresh = jar.get("care_refresh")?.value;
  const isAuth = ["auth/login", "auth/register", "auth/refresh"].includes(pathName);
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const send = (token?: string) => fetch(endpoint, {
    method: request.method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
    cache: "no-store",
  });

  let upstream = await send(isAuth ? undefined : access);
  let rotated: { access_token: string; refresh_token: string; user: unknown } | undefined;
  if (upstream.status === 401 && refresh && !isAuth) {
    const refreshResponse = await fetch(`${backend}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    if (refreshResponse.ok) {
      const tokens = await refreshResponse.json() as { access_token: string; refresh_token: string; user: unknown };
      rotated = tokens;
      upstream = await send(tokens.access_token);
    }
  }

  const authResponse = isAuth && upstream.ok && pathName !== "auth/refresh";
  if ((pathName === "auth/refresh" && upstream.ok) || authResponse) {
    const tokens = rotated ?? await upstream.json();
    const response = NextResponse.json({ user: tokens.user }, { status: upstream.status });
    response.cookies.set("care_access", tokens.access_token, { ...cookieOptions, maxAge: 15 * 60 });
    response.cookies.set("care_refresh", tokens.refresh_token, { ...cookieOptions, maxAge: 14 * 24 * 60 * 60 });
    return response;
  }

  if (pathName === "auth/logout") {
    const response = new NextResponse(null, { status: upstream.status });
    response.cookies.delete("care_access");
    response.cookies.delete("care_refresh");
    return response;
  }

  const responseBody = upstream.status === 204 ? null : await upstream.text();
  const response = new NextResponse(responseBody, { status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" } });
  if (rotated) {
    response.cookies.set("care_access", rotated.access_token, { ...cookieOptions, maxAge: 15 * 60 });
    response.cookies.set("care_refresh", rotated.refresh_token, { ...cookieOptions, maxAge: 14 * 24 * 60 * 60 });
  }
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;