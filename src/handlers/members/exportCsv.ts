import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { connectToMongo } from "../../adapters/database";
import { verifyJWT } from "../../lib/jwt";
import { AppError } from "../../lib/appError";
import { errorResponse } from "../../lib/http";
import { Member } from "../../lib/types";
import { stringifyCsv } from "../../lib/csv";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const token = event.headers.authorization?.split(" ")[1];
  if (!token) {
    return errorResponse(event, 401, "NO_TOKEN_PROVIDED");
  }

  try {
    verifyJWT(token);

    const db = await connectToMongo();
    const collection = db.collection<Member>("members");

    const headers = ["firstName", "lastName", "email", "blocked", "emailValid", "emailInvalid", "createdAt"];
    const rows: unknown[][] = [headers];

    const cursor = collection
      .find(
        {},
        {
          projection: {
            firstName: 1,
            lastName: 1,
            email: 1,
            blocked: 1,
            emailValid: 1,
            emailInvalid: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ createdAt: -1 });

    for await (const m of cursor) {
      rows.push([
        m.firstName ?? "",
        m.lastName ?? "",
        m.email ?? "",
        Boolean(m.blocked),
        Boolean(m.emailValid),
        Boolean((m as { emailInvalid?: boolean }).emailInvalid),
        m.createdAt instanceof Date ? m.createdAt.toISOString() : "",
      ]);
    }

    const csv = stringifyCsv(rows, "\n");
    const date = new Date().toISOString().split("T")[0];

    return {
      statusCode: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="members-${date}.csv"`,
        "cache-control": "no-store",
        // Allow browsers to read Content-Disposition if needed
        "access-control-expose-headers": "content-disposition",
      },
      body: csv,
    };
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_TOKEN") {
      return errorResponse(event, 401, "INVALID_TOKEN");
    }
    return errorResponse(event, 500, "INTERNAL_SERVER_ERROR");
  }
};

