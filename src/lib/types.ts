export interface Member {
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    blocked: boolean;
    qrUuid: string;
    emailValid: boolean;
}

export interface CheckIn {
    _id?: string;
    memberId: string | null;
    checkInTime: Date;
    source: "raspberry_pi" | "admin" | "unknown";
    warning?: string | null;
    warningCode?: "INVALID_QR" | "MEMBER_BLOCKED" | null;
    warningParams?: Record<string, unknown>;
    qrUuid?: string;
}

export interface WebSocketConnection {
    _id?: string;
    connectionId: string;
    connectedAt: Date;
}

export interface EmailVerification {
    _id?: string;
    memberId: string;
    verificationCode: string;
    expiresAt: Date;
    createdAt: Date;
}