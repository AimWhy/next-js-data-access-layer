import { redirect } from "next/navigation"
import {
  createErrorReturn,
  createSuccessReturn,
  DalError,
  DalReturn,
  ThrowableDalError,
} from "./types"
import { UserRole, UserTable } from "@/db"
import { getCurrentUser } from "@/features/auth/lib/getCurrentUser"
import { DrizzleQueryError } from "drizzle-orm"

/**
 * 校验逻辑：仅支持 Pipe 模式。
 * 返回一个 DalReturn，包含当前用户；如果失败则直接返回错误。
 */
export async function dalRequireAuth(
  options?: { allowedRoles?: UserRole[] }
): Promise<DalReturn<typeof UserTable.$inferSelect>> {
  const user = await getCurrentUser()

  if (user == null) {
    return createErrorReturn({ type: "no-user" })
  }

  if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
    return createErrorReturn({ type: "no-access" })
  }

  return createSuccessReturn(user);
}

/**
 * 数据库操作：仅支持作为一个执行逻辑。
 */
export async function dalDbOperation<T>(operation: () => Promise<T>): Promise<DalReturn<T>> {
  try {
    const data = await operation()
    return createSuccessReturn(data)
  } catch (e) {
    if (e instanceof ThrowableDalError) {
      return createErrorReturn(e.dalError)
    }
    if (e instanceof DrizzleQueryError) {
      return createErrorReturn({ type: "drizzle-error", error: e })
    }
    return createErrorReturn({ type: "unknown-error", error: e })
  }
}

export function dalThrowError<T, E extends DalError>(
  dalReturn: DalReturn<T, E>,
) {
  if (dalReturn.success) return dalReturn

  throw dalReturn.error
}

export function dalVerifySuccess<T, E extends DalError>(
  dalReturn: DalReturn<T, E>,
  { unauthorizedRedirectPath }: { unauthorizedRedirectPath?: string } = {},
): T {
  const res = dalThrowError<T, E>(
    dalUnauthorizedRedirect(
      dalLoginRedirect(dalReturn),
      unauthorizedRedirectPath,
    ),
  )
  return res.data
}

export function dalLoginRedirect<T, E extends DalError>(
  dalReturn: DalReturn<T, E>,
) {
  if (dalReturn.success) return dalReturn
  if (dalReturn.error.type === "no-user") return redirect("/login")

  return dalReturn as DalReturn<T, Exclude<E, { type: "no-user" }>>
}

export function dalUnauthorizedRedirect<T, E extends DalError>(
  dalReturn: DalReturn<T, E>,
  redirectPath = "/",
) {
  if (dalReturn.success) return dalReturn
  if (dalReturn.error.type === "no-access") return redirect(redirectPath)

  return dalReturn as DalReturn<T, Exclude<E, { type: "no-access" }>>
}

export function dalFormatErrorMessage(error: DalError) {
  const type = error.type

  switch (error.type) {
    case "no-user":
      return "You must be logged in to perform this action."
    case "no-access":
      return "You do not have permission to perform this action."
    case "drizzle-error":
      return `A database error occurred`
    case "unknown-error":
      return `An unknown error occurred`
    default:
      throw new Error(`Unhandled error type: ${type as never}`)
  }
}
