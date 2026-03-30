/**
 * SST may try to create CloudWatch log groups that already exist (partial deploy).
 * Removing these two lets `sst deploy` succeed. Lambdas are not deleted.
 *
 * Tries AWS CLI first (same credentials/profile as `aws` on your machine), then SDK.
 */
const { execSync } = require("child_process");
const { CloudWatchLogsClient, DeleteLogGroupCommand } = require("@aws-sdk/client-cloudwatch-logs");

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-west-1";
const suffix = process.env.LAMBDA_NAME_SUFFIX || "obenatlapnatha";

const names = [
  `/aws/lambda/15PalleKioskWebSocketConnectFunction-${suffix}`,
  `/aws/lambda/15PalleKioskWebSocketDisconnectFunction-${suffix}`,
];

function awsCliWorks() {
  try {
    execSync("aws --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function deleteViaCli(logGroupName) {
  try {
    execSync(
      `aws logs delete-log-group --region ${region} --log-group-name "${logGroupName}"`,
      { stdio: "pipe", encoding: "utf8", env: process.env },
    );
    console.log("[deploy] Removed log group:", logGroupName);
  } catch (e) {
    const stderr = (e.stderr && e.stderr.toString()) || "";
    const stdout = (e.stdout && e.stdout.toString()) || "";
    const out = stderr + stdout;
    if (/ResourceNotFoundException|not found/i.test(out)) {
      console.log("[deploy] Log group not found (ok):", logGroupName);
      return;
    }
    throw e;
  }
}

async function deleteViaSdk(logGroupName) {
  const client = new CloudWatchLogsClient({ region });
  try {
    await client.send(new DeleteLogGroupCommand({ logGroupName }));
    console.log("[deploy] Removed log group:", logGroupName);
  } catch (e) {
    if (e.name === "ResourceNotFoundException") {
      console.log("[deploy] Log group not found (ok):", logGroupName);
    } else {
      throw e;
    }
  }
}

async function main() {
  if (process.env.SST_SKIP_KIOSK_LOG_PRUNE === "1") {
    console.log("[deploy] Skipping kiosk log group prune (SST_SKIP_KIOSK_LOG_PRUNE=1).");
    return;
  }

  const useCli = awsCliWorks();
  if (useCli) {
    console.log("[deploy] Pruning kiosk Lambda log groups via AWS CLI...");
    for (const logGroupName of names) {
      try {
        deleteViaCli(logGroupName);
      } catch (e) {
        const msg = String(e.message || e);
        if (/credentials|Unable to locate|SSO/i.test(msg)) {
          console.warn("[deploy] AWS CLI failed:", msg);
          throw new Error("AWS_CLI_CREDENTIALS");
        }
        throw e;
      }
    }
    return;
  }

  console.log("[deploy] Pruning kiosk Lambda log groups via AWS SDK...");
  for (const logGroupName of names) {
    await deleteViaSdk(logGroupName);
  }
}

main().catch((err) => {
  const msg = String(err.message || err);
  if (err.message === "AWS_CLI_CREDENTIALS" || /credentials|Could not load credentials/i.test(msg)) {
    console.warn("[deploy] Skipping kiosk log group prune (no AWS credentials).");
    console.warn("[deploy] Fix: run `aws configure` or `aws sso login`, then: npm run deploy:prod");
    process.exit(0);
  }
  console.error("[deploy] delete-kiosk-log-groups failed:", msg);
  process.exit(1);
});
