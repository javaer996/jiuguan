import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PAGES = new Set(["/", "/login", "/register"]);

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/health",
];

function isPublicApi(pathname: string) {
  return PUBLIC_API.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function unauthorizedApi(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 },
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const isApi = pathname.startsWith("/api");

  // 已登录用户访问登录/注册页时直接进入酒馆
  if (pathname === "/login" || pathname === "/register") {
    if (payload) {
      return NextResponse.redirect(new URL("/chats", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.has(pathname) || isPublicApi(pathname)) {
    return NextResponse.next();
  }

  if (!payload) {
    if (isApi) return unauthorizedApi("请先登录");

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const isAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/");

  if (isAdminRoute && payload.role !== "admin") {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "需要管理员权限" } },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|uploads/|.*\\.(?:png|jpe?g|gif|webp|svg|ico|css|js|map|woff2?|ttf|txt|xml)$).*)",
  ],
};
