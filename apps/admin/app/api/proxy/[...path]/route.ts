import { NextRequest, NextResponse } from "next/server";

function getApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return raw.replace(/\/$/, "");
}

async function forward(request: NextRequest, path: string[]) {
  const baseUrl = getApiBaseUrl();
  const search = request.nextUrl.search || "";
  const targetUrl = `${baseUrl}/${path.join("/")}${search}`;

  const outboundHeaders = new Headers();

  // Preserve auth and content headers for API compatibility.
  const allowedHeaders = [
    "authorization",
    "content-type",
    "accept",
    "x-request-id",
    "x-forwarded-for",
    "x-forwarded-proto",
  ];

  for (const [key, value] of request.headers.entries()) {
    if (allowedHeaders.includes(key.toLowerCase())) {
      outboundHeaders.set(key, value);
    }
  }

  const init: RequestInit = {
    method: request.method,
    headers: outboundHeaders,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);
  const body = await upstream.text();

  const response = new NextResponse(body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  // Pass through content metadata so JSON/errors are returned correctly.
  const passthroughHeaders = [
    "content-type",
    "set-cookie",
    "cache-control",
    "pragma",
    "expires",
  ];

  for (const [key, value] of upstream.headers.entries()) {
    if (passthroughHeaders.includes(key.toLowerCase())) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path || []);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path || []);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path || []);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path || []);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path || []);
}
