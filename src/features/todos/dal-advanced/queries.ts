import { eq } from "drizzle-orm"
import { db, TodoTable } from "../../../db"
import { dalDbOperation, dalRequireAuth } from "@/dal/helpers"
import { dal } from "@/dal/pipe"

export async function getCurrentUserTodos<
  const T extends { [K in keyof typeof TodoTable.$inferSelect]?: boolean },
>(columns: T) {
  return dal(dalRequireAuth())
    .pipe(user => dalDbOperation(() => {
      return db.query.TodoTable.findMany({
        columns,
        where: eq(TodoTable.userId, user.id),
      })
    }))
    .$execute()
}

export async function getAllTodos() {
  return dal(dalRequireAuth({ allowedRoles: ["admin"] }))
    .pipe(() => dalDbOperation(() => {
      return db.query.TodoTable.findMany({
        with: {
          user: true,
        },
      })
    }))
    .$execute()
}
