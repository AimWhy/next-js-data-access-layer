import { DalError, DalReturn } from "./types";

export type DalPipeFn<T, R> = (data: T) => Promise<DalReturn<R>> | DalReturn<R>;

export class DalChain<T> {
  constructor(private promise: Promise<DalReturn<T>>) {}

  /**
   * 链式调用：如果前一步成功，则执行下一步逻辑；如果前一步已经失败，则直接向下传递该错误。
   */
  pipe<R>(fn: DalPipeFn<T, R>): DalChain<R> {
    const nextPromise = this.promise.then(async (res) => {
      if (!res.success) {
        return res as unknown as DalReturn<R>;
      }
      return fn(res.data);
    });

    return new DalChain(nextPromise);
  }

  /**
   * 用于执行一些副作用或进行结果转换，不管成功失败都会执行。
   */
  after(fn: (res: DalReturn<T>) => Promise<DalReturn<T> | void> | DalReturn<T> | void): DalChain<T> {
    const nextPromise = this.promise.then(async (res) => {
      const result = await fn(res);
      if (result && "success" in result) {
        return result;
      }
      return res;
    });

    return new DalChain(nextPromise);
  }

  /**
   * 尾方法：用于获取错误信息。
   * 成功返回 null/void，失败返回格式化后的错误信息。
   */
  async $actionResponse(errorFormatter: (err: DalError) => string) {
    const res = await this.promise;
    if (res.success) return;
    return errorFormatter(res.error);
  }

  /**
   * 尾方法：获取结果，如果失败则抛出错误。相当于管道版的 dalVerifySuccess。
   */
  async $unwrap() {
    const res = await this.promise;
    if (!res.success) {
      throw res.error;
    }
    return res.data;
  }

  /**
   * 尾方法：获取最终的 Promise<DalReturn<T>>
   */
  $execute(): Promise<DalReturn<T>> {
    return this.promise;
  }
}

/**
 * 包装一个初值或 Promise 进入 DAL 链。
 */
export function dal<T>(initial: DalReturn<T> | Promise<DalReturn<T>>) {
  return new DalChain(
    initial instanceof Promise ? initial : Promise.resolve(initial)
  );
}
