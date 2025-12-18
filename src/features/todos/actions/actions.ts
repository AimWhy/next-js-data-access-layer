"use server"

import { dalFormatErrorMessage, dalLoginRedirect } from "@/dal/helpers"
import { insertTodo, updateTodo } from "@/features/todos/dal-advanced/mutations"
import { dal } from "@/dal/pipe"

export async function addTodoAction(formData: FormData) {
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const priority = formData.get("priority") as "low" | "medium" | "high"
  const dueDateString = formData.get("dueDate") as string

  if (!title || title.trim().length === 0) {
    throw new Error("Title is required")
  }

  const dueDate = dueDateString ? new Date(dueDateString) : null

  return dal(insertTodo({
    title: title.trim(),
    description: description?.trim() || null,
    priority,
    dueDate,
    completed: false,
  }))
    .after(dalLoginRedirect)
    .$actionResponse(dalFormatErrorMessage)
}

export async function toggleTodoAction(todoId: number, completed: boolean) {
  return dal(updateTodo(todoId, {
    completed,
  }))
    .after(dalLoginRedirect)
    .$actionResponse(dalFormatErrorMessage)
}
