import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { connectToMongo } from "./database";

async function broadcastToCollection(data: unknown, collectionName: string, websocketUrlEnv: string) {
    const db = await connectToMongo();
    const connections = await db.collection(collectionName).find({}).toArray();

    if (connections.length === 0) return;

    const websocketUrl = process.env[websocketUrlEnv];
    if (!websocketUrl) return;
    const endpoint = websocketUrl.replace("wss://", "https://");
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
                await db.collection(collectionName).deleteOne({ connectionId: conn.connectionId });
            }
        }
    });

    await Promise.all(sendPromises);
}

export async function broadcastToDashboard(data: unknown) {
    await broadcastToCollection(data, "connections", "WEBSOCKET_API_URL");
}

export async function broadcastToKiosk(data: unknown) {
    await broadcastToCollection(data, "kioskConnections", "WEBSOCKET_KIOSK_API_URL");
}
