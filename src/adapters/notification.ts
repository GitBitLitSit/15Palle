import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { connectToMongo } from "./database";

export async function broadcastToDashboard(data: any) {
    const db = await connectToMongo();
    const connections = await db.collection("connections").find({}).toArray();

    if (connections.length === 0) return;

    const endpoint = process.env.WEBSOCKET_API_URL!.replace("wss://", "https://");
    const client = new ApiGatewayManagementApiClient({ endpoint });

    const message = JSON.stringify(data);

    const sendPromises = connections.map(async (conn) => {
        try {
            await client.send(new PostToConnectionCommand({
                ConnectionId: conn.connectionId,
                Data: message
            }));
        } catch (err: unknown) {
            const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: number }).statusCode : undefined;
            if (statusCode === 410) {
                await db.collection("connections").deleteOne({ connectionId: conn.connectionId });
            }
        }
    });

    await Promise.all(sendPromises);
}