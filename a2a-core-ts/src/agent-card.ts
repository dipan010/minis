import { AgentCard } from "./types";

export function buildAgentCard(config: AgentCard): AgentCard {
  return {
    name: config.name,
    description: config.description,
    url: config.url,
    version: config.version,
    capabilities: config.capabilities ?? { streaming: false, pushNotifications: false },
    skills: config.skills,
    defaultInputModes: config.defaultInputModes ?? ["text/plain"],
    defaultOutputModes: config.defaultOutputModes ?? ["application/json"],
    authentication: config.authentication,
  };
}

export function agentCardResponse(card: AgentCard): Response {
  return new Response(JSON.stringify(card, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
