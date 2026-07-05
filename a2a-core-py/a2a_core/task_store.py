"""Thread-safe in-memory task store."""

from __future__ import annotations

import threading
from datetime import datetime, timezone

from .models import Artifact, Message, Task, TaskState, TaskStatus


VALID_TRANSITIONS: dict[TaskStatus, list[TaskStatus]] = {
    TaskStatus.SUBMITTED: [TaskStatus.WORKING, TaskStatus.CANCELED, TaskStatus.FAILED],
    TaskStatus.WORKING: [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELED],
    TaskStatus.COMPLETED: [],
    TaskStatus.FAILED: [],
    TaskStatus.CANCELED: [],
}


class TaskStore:
    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}
        self._lock = threading.Lock()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def create(
        self,
        task_id: str,
        session_id: str | None = None,
        metadata: dict | None = None,
    ) -> Task:
        with self._lock:
            if task_id in self._tasks:
                raise ValueError(f"Task {task_id} already exists")
            task = Task(
                id=task_id,
                sessionId=session_id,
                status=TaskState(status=TaskStatus.SUBMITTED, timestamp=self._now()),
                messages=[],
                artifacts=[],
                metadata=metadata,
            )
            self._tasks[task_id] = task
            return task

    def get(self, task_id: str) -> Task | None:
        with self._lock:
            return self._tasks.get(task_id)

    def update_status(
        self,
        task_id: str,
        new_status: TaskStatus,
        message: Message | None = None,
    ) -> Task:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise ValueError(f"Task {task_id} not found")

            current = task.status.status
            allowed = VALID_TRANSITIONS[current]
            if new_status not in allowed:
                raise ValueError(
                    f"Invalid state transition: {current.value} → {new_status.value}. "
                    f"Allowed: {[s.value for s in allowed]}"
                )

            task.status = TaskState(
                status=new_status,
                message=message,
                timestamp=self._now(),
            )
            return task

    def add_message(self, task_id: str, message: Message) -> Task:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise ValueError(f"Task {task_id} not found")
            task.messages.append(message)
            return task

    def add_artifact(self, task_id: str, artifact: Artifact) -> Task:
        with self._lock:
            task = self._tasks.get(task_id)
            if task is None:
                raise ValueError(f"Task {task_id} not found")
            artifact.index = len(task.artifacts)
            task.artifacts.append(artifact)
            return task

    def cancel(self, task_id: str) -> Task:
        return self.update_status(task_id, TaskStatus.CANCELED)

    def list_tasks(self) -> list[Task]:
        with self._lock:
            return list(self._tasks.values())

    def delete(self, task_id: str) -> bool:
        with self._lock:
            return self._tasks.pop(task_id, None) is not None
