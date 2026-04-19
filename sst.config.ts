/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    const awsProfile = process.env.PROFILE_AWS || process.env.AWS_PROFILE;

    return {
      name: "billiard-club",
      home: "aws",
      providers: {
        aws: {
          region: "eu-west-1",
          ...(awsProfile ? { profile: awsProfile } : {}),
        },
      },
    };
  },

  async run() {
    const stageToken = $app.stage.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 24);
    // Production uses this suffix so we update the existing Lambdas (named with PC suffix), not create new ones
    const productionSuffix = process.env.LAMBDA_NAME_SUFFIX || "obenatlapnatha";
    const lambdaName = (base: string) =>
      $app.stage === "production"
        ? `${base}-${productionSuffix}`.slice(0, 64)
        : `${base}-${stageToken}`.slice(0, 64);
    // Import existing Lambdas so deploy updates them instead of creating (remove opts.import after first successful deploy)
    const importTransform = (fnBase: string) => ({
      function: (_args: unknown, opts: { import?: string }) => {
        opts.import = lambdaName(fnBase);
      },
    });
    /** Use when AWS already has `/aws/lambda/<name>` but it is not in Pulumi state (avoids CreateLogGroup conflict). */
    const importTransformWithLogGroup = (fnBase: string) => ({
      function: (_args: unknown, opts: { import?: string }) => {
        opts.import = lambdaName(fnBase);
      },
      logGroup: (_args: unknown, opts: { import?: string }) => {
        opts.import = `/aws/lambda/${lambdaName(fnBase)}`;
      },
    });
    const configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    const corsOrigins = Array.from(
      new Set([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://15palle.com",
        "https://www.15palle.com",
        ...configuredCorsOrigins,
      ]),
    );

    const api = new sst.aws.ApiGatewayV2("Api", {
      cors: {
        allowOrigins: corsOrigins,
        allowHeaders: ["Content-Type", "Authorization", "Accept-Language"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      },
    });

    api.route("POST /admin/login", {
      handler: "./src/handlers/admin/login.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        ADMIN_USERNAME: process.env.ADMIN_USERNAME!,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleAdminLoginFunction"),
      transform: importTransform("15PalleAdminLoginFunction"),
    });

    api.route("GET /members", {
      handler: "./src/handlers/members/get.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleGetMembersFunction"),
      transform: importTransform("15PalleGetMembersFunction"),
    })

    api.route("POST /members", {
      handler: "./src/handlers/members/create.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleCreateMemberFunction"),
      transform: importTransform("15PalleCreateMemberFunction"),
    });

    api.route("GET /members/export", {
      handler: "./src/handlers/members/exportCsv.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleExportMembersFunction"),
      transform: importTransform("15PalleExportMembersFunction"),
    });

    api.route("POST /members/import", {
      handler: "./src/handlers/members/importCsv.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleImportMembersFunction"),
      transform: importTransform("15PalleImportMembersFunction"),
    });

    api.route("POST /members/import/batch", {
      handler: "./src/handlers/members/importBatch.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleImportMembersBatchFunction"),
      transform: importTransform("15PalleImportMembersBatchFunction"),
    });

    api.route("POST /check-existing-users", {
      handler: "./src/handlers/members/checkExistingUsers.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleCheckExistingUsersFunction"),
      transform: importTransform("15PalleCheckExistingUsersFunction"),
    });

    api.route("POST /bulk-create-users", {
      handler: "./src/handlers/members/bulkCreateUsers.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleBulkCreateUsersFunction"),
      transform: importTransform("15PalleBulkCreateUsersFunction"),
    });


    api.route("PUT /members/{id}", {
      handler: "./src/handlers/members/update.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleUpdateMemberFunction"),
      transform: importTransform("15PalleUpdateMemberFunction"),
    })

    api.route("DELETE /members/{id}", {
      handler: "./src/handlers/members/delete.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleDeleteMemberFunction"),
      transform: importTransform("15PalleDeleteMemberFunction"),
    })

    api.route("POST /members/reset-qrcode", {
      handler: "./src/handlers/members/resetQrCode.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleResetMemberQrCodeFunction"),
      transform: importTransform("15PalleResetMemberQrCodeFunction"),
    });

    api.route("POST /members/recover", {
      handler: "./src/handlers/members/recover.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleRecoverMemberFunction"),
      transform: importTransform("15PalleRecoverMemberFunction"),
    });

    api.route("GET /auth/check-ins", {
      handler: "./src/handlers/access/get.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleGetCheckInsFunction"),
      transform: importTransform("15PalleGetCheckInsFunction"),
    });

    api.route("GET /auth/check-ins/by-customer", {
      handler: "./src/handlers/access/getGroupedByCustomer.handler",
      environment: {
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleGetCheckInsByCustomerFunction"),
      transform: importTransformWithLogGroup("15PalleGetCheckInsByCustomerFunction"),
    });

    api.route("POST /auth/request-verification", {
      handler: "./src/handlers/auth/requestVerification.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL!,
        MAIL_API_KEY: process.env.MAIL_API_KEY!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleRequestVerificationFunction"),
      transform: importTransform("15PalleRequestVerificationFunction"),
    })

    const webSocket = new sst.aws.ApiGatewayWebSocket("RealtimeApi");
    const kioskWebSocket = new sst.aws.ApiGatewayWebSocket("KioskRealtimeApi");

    webSocket.route("$connect", {
      handler: "./src/handlers/websocket/connect.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleWebSocketConnectFunction"),
      transform: importTransform("15PalleWebSocketConnectFunction"),
    });

    webSocket.route("$disconnect", {
      handler: "./src/handlers/websocket/disconnect.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleWebSocketDisconnectFunction"),
      transform: importTransform("15PalleWebSocketDisconnectFunction"),
    });

    // Kiosk websocket Lambdas: use importTransform like other routes so existing AWS functions
    // and CloudWatch log groups stay under SST/Pulumi control (avoids duplicate LogGroup errors).
    kioskWebSocket.route("$connect", {
      handler: "./src/handlers/websocket/kioskConnect.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleKioskWebSocketConnectFunction"),
      transform: importTransform("15PalleKioskWebSocketConnectFunction"),
    });

    kioskWebSocket.route("$disconnect", {
      handler: "./src/handlers/websocket/kioskDisconnect.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleKioskWebSocketDisconnectFunction"),
      transform: importTransform("15PalleKioskWebSocketDisconnectFunction"),
    });

    api.route("POST /check-in", {
      handler: "./src/handlers/access/checkIn.handler",
      environment: {
        WEBSOCKET_API_URL: webSocket.url,
        WEBSOCKET_KIOSK_API_URL: kioskWebSocket.url,
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
        JWT_SECRET_KEY: process.env.JWT_SECRET_KEY!,
        RASPBERRY_PI_API_KEY: process.env.RASPBERRY_PI_API_KEY!,
      },
      permissions: [ 
        {
          actions: ["execute-api:ManageConnections"],
          resources: ["*"]
        }
      ],
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleCheckInFunction"),
      transform: importTransform("15PalleCheckInFunction"),
    })
    
    /*const site = new sst.aws.Nextjs("MyWeb", {
      path: "frontend",
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
        NEXT_PUBLIC_WEBSOCKET_API_URL: webSocket.url,
      },
    });*/

    // When using Amplify (not SST) for the frontend: after "npm run dev" or "sst deploy"
    // the WebSocket URL can change. Copy the "websocket" value from the deploy output
    // into Amplify env var NEXT_PUBLIC_WEBSOCKET_API_URL and redeploy the app.
    return {
      api: api.url,
      websocket: webSocket.url,
      kioskWebsocket: kioskWebSocket.url,
      // site: site.url,
    };
  }
});