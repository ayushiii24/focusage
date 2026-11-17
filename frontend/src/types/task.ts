// Values accepted by our task API.
export type Priority = "low" | "medium" | "high";
export type TaskFilter = "all" | "pending" | "completed";
export type TaskSort = "deadline" | "priority" | "recent";

// Shape used by the React UI.
export type Task = {
  id: string;
  title: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
};

// Shape returned by MongoDB through Express.
export type ApiTask = {
  _id: string;
  title: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

// Convert the backend task shape into the UI task shape.
export function toTask(apiTask: ApiTask): Task {
  return {
    id: apiTask._id,
    title: apiTask.title,
    // Keep the value compatible with the existing UI.
    deadline: apiTask.deadline
      ? apiTask.deadline.slice(0, 16)
      : "",
    priority: apiTask.priority,
    completed: apiTask.completed,
  };
}