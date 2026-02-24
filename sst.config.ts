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
    const lambdaName = (base: string) =>
      $app.stage === "production" ? base : `${base}-${stageToken}`.slice(0, 64);

    const api = new sst.aws.ApiGatewayV2("Api");

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
    })

    const webSocket = new sst.aws.ApiGatewayWebSocket("RealtimeApi");

    webSocket.route("$connect", {
      handler: "./src/handlers/websocket/connect.handler",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
      },
      architecture: "arm64",
      runtime: "nodejs22.x",
      name: lambdaName("15PalleWebSocketConnectFunction"),
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
    });

    api.route("POST /check-in", {
      handler: "./src/handlers/access/checkIn.handler",
      environment: {
        WEBSOCKET_API_URL: webSocket.url,
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
    })
    
    const site = new sst.aws.Nextjs("MyWeb", {
      path: "frontend",
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
        NEXT_PUBLIC_WEBSOCKET_API_URL: webSocket.url,
      },
    });

    return {
      api: api.url,
      websocket: webSocket.url,
      site: site.url,
    };
  }
});