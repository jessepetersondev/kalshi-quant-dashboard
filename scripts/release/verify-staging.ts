interface ReleaseArgs {
  readonly baseUrl: string;
}

function parseArgs(argv: readonly string[]): ReleaseArgs {
  let baseUrl = "http://127.0.0.1:39080";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--base-url" && argv[index + 1]) {
      baseUrl = argv[index + 1]!;
      index += 1;
    }
  }

  return { baseUrl };
}

async function assertOk(
  input: string,
  init?: RequestInit & { readonly expectedStatus?: number }
): Promise<Response> {
  const response = await fetch(input, init);
  const expectedStatus = init?.expectedStatus ?? 200;
  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus} for ${input}, received ${response.status}`);
  }
  return response;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const operatorHeaders = {
    cookie: "kqd_session=operator@example.internal"
  };
  const adminHeaders = {
    cookie: "kqd_session=admin@example.internal"
  };

  await assertOk(`${args.baseUrl}/health/live`);
  await assertOk(`${args.baseUrl}/health/ready`);
  await assertOk(`${args.baseUrl}/overview`);
  await assertOk(`${args.baseUrl}/admin/access-policies`);
  await assertOk(`${args.baseUrl}/admin/feature-flags`);

  const sessionResponse = await assertOk(`${args.baseUrl}/api/auth/session`, {
    headers: adminHeaders
  });
  const session = (await sessionResponse.json()) as {
    effectiveCapability: { readonly canManageAccessPolicies: boolean };
  };
  if (!session.effectiveCapability.canManageAccessPolicies) {
    throw new Error("Admin session did not expose access-policy capability.");
  }

  const overviewResponse = await assertOk(`${args.baseUrl}/api/overview`, {
    headers: operatorHeaders
  });
  const overview = (await overviewResponse.json()) as {
    recentAlerts: readonly { readonly alertId: string }[];
  };
  const alertId = overview.recentAlerts[0]?.alertId;
  if (!alertId) {
    throw new Error("Overview response did not contain a seeded alert.");
  }

  await assertOk(`${args.baseUrl}/alerts/${alertId}`);
  await assertOk(`${args.baseUrl}/api/alerts/${alertId}?detailLevel=standard&timezone=utc`, {
    headers: operatorHeaders
  });

  const alertRuleResponse = await assertOk(`${args.baseUrl}/api/admin/alert-rules`, {
    headers: adminHeaders
  });
  const alertRules = (await alertRuleResponse.json()) as {
    items: readonly unknown[];
  };
  if (alertRules.items.length === 0) {
    throw new Error("Alert-rule defaults were not loaded.");
  }

  const sseResponse = await assertOk(
    `${args.baseUrl}/api/live/stream?channels=overview&timezone=utc&detailLevel=standard`,
    {
      headers: operatorHeaders
    }
  );
  const sseBody = await sseResponse.text();
  const lastEventId = sseBody
    .split("\n")
    .find((line) => line.startsWith("id: "))
    ?.replace("id: ", "")
    .trim();

  if (!sseBody.includes("event:")) {
    throw new Error("SSE stream did not emit any events.");
  }

  if (lastEventId) {
    await assertOk(
      `${args.baseUrl}/api/live/stream?channels=overview&timezone=utc&detailLevel=standard`,
      {
        headers: {
          ...operatorHeaders,
          "Last-Event-ID": lastEventId
        }
      }
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
