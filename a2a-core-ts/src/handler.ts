import { TaskStore } from "./task-store";
import {
  parseJsonRpcRequest,
  makeJsonRpcResponse,
  makeJsonRpcErrorResponse,
  JSON_RPC_ERRORS,
} from "./json-rpc";
import {
  Task,
  TaskSendParams,
  TaskGetParams,
  TaskCancelParams,
  Message,
  Artifact,
  Part,
} from "./types";

export type TaskSendHandler = (params: TaskSendParams) => Promise<{
  artifacts: Artifact[];
  agentMessage?: Message;
}>;

export type TaskStreamHandler = (
  params: TaskSendParams,
  onEvent: (event: TaskStreamEvent) => void
) => Promise<void>;

export interface TaskStreamEvent {
  type: "status" | "artifact";
  status?: "working" | "completed" | "failed";
  artifact?: Artifact;
  message?: Message;
}

export interface A2AHandlerConfig {
  taskStore: TaskStore;
  onTaskSend: TaskSendHandler;
  onTaskStream?: TaskStreamHandler;
}

export class A2AHandler {
  private store: TaskStore;
  private onTaskSend: TaskSendHandler;
  private onTaskStream?: TaskStreamHandler;

  constructor(config: A2AHandlerConfig) {
    this.store = config.taskStore;
    this.onTaskSend = config.onTaskSend;
    this.onTaskStream = config.onTaskStream;
  }

  async handleRequest(body: unknown): Promise<Response> {
    let rpcRequest;
    try {
      rpcRequest = parseJsonRpcRequest(body);
    } catch (errorResponse) {
      return Response.json(errorResponse, { status: 400 });
    }

    const { id, method, params } = rpcRequest;

    switch (method) {
      case "tasks/send":
        return this.handleTaskSend(id, params as unknown as TaskSendParams);

      case "tasks/get":
        return this.handleTaskGet(id, params as unknown as TaskGetParams);

      case "tasks/cancel":
        return this.handleTaskCancel(id, params as unknown as TaskCancelParams);

      case "tasks/sendSubscribe":
        if (!this.onTaskStream) {
          return Response.json(
            makeJsonRpcErrorResponse(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, "Streaming not supported by this agent"),
            { status: 400 }
          );
        }
        return this.handleTaskStream(id, params as unknown as TaskSendParams);

      default:
        return Response.json(
          makeJsonRpcErrorResponse(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND),
          { status: 400 }
        );
    }
  }

  private async handleTaskSend(
    rpcId: string | number,
    params: TaskSendParams
  ): Promise<Response> {
    if (!params?.id || !params?.message) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.INVALID_PARAMS, "Missing task id or message"),
        { status: 400 }
      );
    }

    try {
      // Create or reuse task
      let task: Task;
      const existing = this.store.get(params.id);
      if (existing) {
        task = existing;
      } else {
        task = this.store.create(params.id, params.sessionId, params.metadata);
      }

      // Add user message
      this.store.addMessage(params.id, params.message);

      // Transition to working
      this.store.updateStatus(params.id, "working");

      // Execute the handler
      const result = await this.onTaskSend(params);

      // Add artifacts
      for (const artifact of result.artifacts) {
        this.store.addArtifact(params.id, artifact);
      }

      // Transition to completed
      this.store.updateStatus(params.id, "completed", result.agentMessage);

      const finalTask = this.store.get(params.id)!;
      return Response.json(makeJsonRpcResponse(rpcId, finalTask));
    } catch (err) {
      // Attempt to mark task as failed
      try {
        this.store.updateStatus(params.id, "failed", {
          role: "agent",
          parts: [{ type: "text", text: err instanceof Error ? err.message : "Unknown error" }],
        });
      } catch {
        // Task might not exist or already in terminal state
      }

      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.INTERNAL_ERROR, err instanceof Error ? err.message : "Unknown error"),
        { status: 500 }
      );
    }
  }

  private async handleTaskGet(
    rpcId: string | number,
    params: TaskGetParams
  ): Promise<Response> {
    if (!params?.id) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.INVALID_PARAMS, "Missing task id"),
        { status: 400 }
      );
    }

    const task = this.store.get(params.id);
    if (!task) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.TASK_NOT_FOUND),
        { status: 404 }
      );
    }

    return Response.json(makeJsonRpcResponse(rpcId, task));
  }

  private async handleTaskCancel(
    rpcId: string | number,
    params: TaskCancelParams
  ): Promise<Response> {
    if (!params?.id) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.INVALID_PARAMS, "Missing task id"),
        { status: 400 }
      );
    }

    const task = this.store.get(params.id);
    if (!task) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.TASK_NOT_FOUND),
        { status: 404 }
      );
    }

    try {
      this.store.cancel(params.id);
      const updated = this.store.get(params.id)!;
      return Response.json(makeJsonRpcResponse(rpcId, updated));
    } catch {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.TASK_NOT_CANCELABLE, `Task is in ${task.status.status} state`),
        { status: 400 }
      );
    }
  }

  private async handleTaskStream(
    rpcId: string | number,
    params: TaskSendParams
  ): Promise<Response> {
    if (!params?.id || !params?.message) {
      return Response.json(
        makeJsonRpcErrorResponse(rpcId, JSON_RPC_ERRORS.INVALID_PARAMS, "Missing task id or message"),
        { status: 400 }
      );
    }

    // Create task
    const existing = this.store.get(params.id);
    if (!existing) {
      this.store.create(params.id, params.sessionId, params.metadata);
    }
    this.store.addMessage(params.id, params.message);
    this.store.updateStatus(params.id, "working");

    const store = this.store;
    const onTaskStream = this.onTaskStream!;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventData: unknown) => {
          const sseMessage = `data: ${JSON.stringify(makeJsonRpcResponse(rpcId, eventData))}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        };

        try {
          await onTaskStream(params, (event: TaskStreamEvent) => {
            if (event.type === "status" && event.status) {
              sendEvent({
                type: "TaskStatusUpdateEvent",
                taskId: params.id,
                status: { status: event.status, timestamp: new Date().toISOString() },
                message: event.message,
              });
            } else if (event.type === "artifact" && event.artifact) {
              store.addArtifact(params.id, event.artifact);
              sendEvent({
                type: "TaskArtifactUpdateEvent",
                taskId: params.id,
                artifact: event.artifact,
              });
            }
          });

          // Mark completed
          store.updateStatus(params.id, "completed");
          sendEvent({
            type: "TaskStatusUpdateEvent",
            taskId: params.id,
            status: { status: "completed", timestamp: new Date().toISOString() },
            final: true,
          });
        } catch (err) {
          try {
            store.updateStatus(params.id, "failed");
          } catch { /* already terminal */ }
          sendEvent({
            type: "TaskStatusUpdateEvent",
            taskId: params.id,
            status: { status: "failed", timestamp: new Date().toISOString() },
            message: { role: "agent", parts: [{ type: "text", text: err instanceof Error ? err.message : "Unknown error" }] },
            final: true,
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
