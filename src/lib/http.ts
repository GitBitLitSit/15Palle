import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { getLanguageFromAcceptLanguageHeader, t } from "./i18n";

function getHeader(event: APIGatewayProxyEventV2, headerName: string): string | undefined {
  const headers = event.headers || {};
  const target = headerName.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

export function getRequestLanguage(event: APIGatewayProxyEventV2): string {
  const explicit = getHeader(event, "x-language");
  if (explicit) return explicit;
  const acceptLanguage = getHeader(event, "accept-language");
  return getLanguageFromAcceptLanguageHeader(acceptLanguage);
}

export function getClientIp(event: APIGatewayProxyEventV2): string {
  return event.requestContext?.http?.sourceIp ?? "unknown";
}

export function json(statusCode: number, body: unknown, extraHeaders?: Record<string, string>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  event: APIGatewayProxyEventV2,
  statusCode: number,
  errorCode: string,
  params?: Record<string, unknown>,
  extra?: Record<string, unknown>,
): APIGatewayProxyResultV2 {
  const lang = getRequestLanguage(event);
  return json(statusCode, {
    error: errorCode,
    message: t(lang, `errors.${errorCode}`, params),
    ...(extra || {}),
  });
}

export function messageResponse(
  event: APIGatewayProxyEventV2,
  statusCode: number,
  messageCode: string,
  params?: Record<string, unknown>,
  extra?: Record<string, unknown>,
): APIGatewayProxyResultV2 {
  const lang = getRequestLanguage(event);
  return json(statusCode, {
    message: messageCode,
    messageText: t(lang, `messages.${messageCode}`, params),
    ...(extra || {}),
  });
}

