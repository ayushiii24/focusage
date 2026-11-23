//vals accepted by task api
export type Priority = "low" | "medium" | "high";
export type TaskFilter = "all" | "pending" | "completed";
export type TaskSort = "deadline" | "priority" | "recent";

export type Task = {
  id: string;
  title: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
};

//returned by mongo through express
export type ApiTask = {
  _id: string;
  title: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

//backend sends deadlines as UTC ISO strings, the ui (and guest tasks) use local "YYYY-MM-DDTHH:mm"
function toLocalDateTimeValue(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

//convert backend task form into ui task form
export function toTask(apiTask: ApiTask): Task {
  return {
    id: apiTask._id,
    title: apiTask.title,
    deadline: apiTask.deadline ? toLocalDateTimeValue(apiTask.deadline) : "",
    priority: apiTask.priority,
    completed: apiTask.completed,
  };
}