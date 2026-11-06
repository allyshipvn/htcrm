import { db } from "@crm/db";
import { defineAgent, defineDynamic } from "eve";
import { providerSessionModel } from "../../lib/provider-session-model";
import { attribute, purposeOf } from "../../lib/session-purpose";

export default defineAgent({
	description:
		"Execute one immutable deployed CRM agent version and persist its result and every side effect.",
	model: defineDynamic({
		events: {
			"step.started": async (_event, ctx) =>
				providerSessionModel(async () => {
					if (purposeOf(ctx) !== "team-agent") return null;
					const runId = attribute(ctx, "runId");
					if (!runId) return null;

					const run = await db.agentRun.findUnique({
						where: { id: runId },
						select: {
							version: {
								select: {
									modelId: true,
									modelContextWindowTokens: true,
									modelProviderId: true,
									modelMaxOutputTokens: true,
								},
							},
						},
					});
					return run?.version.modelProviderId &&
						run.version.modelMaxOutputTokens
						? {
								modelId: run.version.modelId,
								providerId: run.version.modelProviderId,
								maxOutputTokens: run.version.modelMaxOutputTokens,
								contextWindowTokens: run.version.modelContextWindowTokens,
							}
						: null;
				}),
		},
	}),
	limits: {
		maxInputTokensPerSession: 500_000,
		maxOutputTokensPerSession: 40_000,
		sessionTimeoutMs: 24 * 60 * 60 * 1000,
	},
});
