import { Task, TaskStatus, TaskState, Message, Artifact } from "./types";

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  submitted: ["working", "canceled", "failed"],
  working: ["completed", "failed", "canceled"],
  completed: [],
  failed: [],
  canceled: [],
};

export class TaskStore {
  private tasks: Map<string, Task> = new Map();

  create(id: string, sessionId?: string, metadata?: Record<string, unknown>): Task {
    if (this.tasks.has(id)) {
      throw new Error(`Task ${id} already exists`);
    }

    const task: Task = {
      id,
      sessionId,
      status: {
        status: "submitted",
        timestamp: new Date().toISOString(),
      },
      messages: [],
      artifacts: [],
      metadata,
    };

    this.tasks.set(id, task);
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateStatus(id: string, newStatus: TaskStatus, message?: Message): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }

    const currentStatus = task.status.status;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid state transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(", ")}`
      );
    }

    task.status = {
      status: newStatus,
      message,
      timestamp: new Date().toISOString(),
    };

    return task;
  }

  addMessage(id: string, message: Message): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    task.messages.push(message);
    return task;
  }

  addArtifact(id: string, artifact: Artifact): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    artifact.index = task.artifacts.length;
    task.artifacts.push(artifact);
    return task;
  }

  cancel(id: string): Task {
    return this.updateStatus(id, "canceled");
  }

  list(): Task[] {
    return Array.from(this.tasks.values());
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
