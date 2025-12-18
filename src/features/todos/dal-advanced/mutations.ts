import { dalDbOperation, dalRequireAuth } from "@/dal/helpers"
import { ThrowableDalError } from "@/dal/types"
import { db, TodoTable } from "@/db"
import { and, eq } from "drizzle-orm"
import { revalidateTag } from "next/cache"
import { dal } from "@/dal/pipe"

export function insertTodo(
  todo: Omit<typeof TodoTable.$inferInsert, "userId">,
) {
  return dal(dalRequireAuth())
    .pipe(user => dalDbOperation(async () => {
      const [newTodo] = await db
        .insert(TodoTable)
        .values({ ...todo, userId: user.id })
        .returning({ id: TodoTable.id })

      revalidateTag(`todos:${newTodo.id}`)
      revalidateTag("todos")

      return newTodo
    }))
    .$execute()
}

export function updateTodo(
  id: number,
  todo: Partial<Omit<typeof TodoTable.$inferInsert, "userId">>,
) {
  return dal(dalRequireAuth())
    .pipe(user => dalDbOperation(async () => {
      const { changes } = await db
        .update(TodoTable)
        .set(todo)
        .where(and(eq(TodoTable.id, id), eq(TodoTable.userId, user.id)))

      if (changes === 0) throw new ThrowableDalError({ type: "no-access" })

      revalidateTag(`todos:${id}`)
      revalidateTag("todos")

      return { id }
    }))
    .$execute()
}
