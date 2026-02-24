import type { APIGatewayProxyEventV2 } from "aws-lambda";

export interface ApiEventOptions {
  method?: string;
  path?: string;
  body?: string | object;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  isBase64Encoded?: boolean;
  requestContext?: Partial<APIGatewayProxyEventV2["requestContext"]>;
}

export function createApiEvent(options: ApiEventOptions = {}): APIGatewayProxyEventV2 {
  const {
    method = "GET",
    path = "/",
    body,
    headers = {},
    pathParameters,
    queryStringParameters,
    isBase64Encoded = false,
    requestContext = {},
  } = options;

  const bodyStr =
    typeof body === "object" ? JSON.stringify(body) : body !== undefined ? String(body) : undefined;

  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    rawQueryString: queryStringParameters
      ? Object.entries(queryStringParameters)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&")
      : "",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    requestContext: {
      accountId: "123456789",
      apiId: "test-api",
      domainName: "test.execute-api.eu-west-1.amazonaws.com",
      http: {
        method,
        path,
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "vitest",
      },
      requestId: "test-request-id",
      routeKey: "$default",
      stage: "test",
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      ...requestContext,
    },
    pathParameters: pathParameters ?? undefined,
    queryStringParameters: queryStringParameters ?? undefined,
    isBase64Encoded,
    body: bodyStr,
    cookies: [],
  } as APIGatewayProxyEventV2;
}

export function parseBody<T>(res: { body?: string | null }): T {
  const raw = res.body;
  if (raw == null) return {} as T;
  return JSON.parse(raw) as T;
}
