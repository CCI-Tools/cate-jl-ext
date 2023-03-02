/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2019-2023 by the Cate development team and contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

type Handler<T> = (
    resolve: (value: T) => any,
    reject: (reason: any) => void,
    count: number
) => void;

/**
 * Throw this error, if you want `callUntil()` to exit immediately.
 */
export class UnrecoverableError extends Error {

    readonly error?: Error;

    constructor(message?: string, error?: Error) {
        super(message);
        this.error = error;
    }
}


/**
 * Call asynchronous function `fetchValue` until it returns a value without throwing an exception.
 * If it throws an exception, it will be executed after a delay of `timeout / maxCount`.
 * This is repeated until `maxCount` is reached or a `UnrecoverableError` is thrown.
 * Eventually, the last exception will be thrown.
 *
 * @param fetchValue The asynchronous function to be called.
 * @param timeout Overall timeout in milliseconds.
 * @param maxCount Maximum number of failures.
 */
export async function callUntil<T>(fetchValue: () => Promise<T>, timeout: number, maxCount: number): Promise<T> {
    const delay = timeout / maxCount;

    const handler: Handler<T> = (resolve, reject, count) => {
        console.debug(`Fetching ${fetchValue.name}() (attempt ${count}/${maxCount})`)
        fetchValue()
            .then(value => {
                resolve(value)
            })
            .catch(error => {
                if (error instanceof UnrecoverableError) {
                    reject(error.error || error);
                } else if (count >= maxCount) {
                    reject(error);
                } else {
                    delayedHandler(resolve, reject, count + 1);
                }
            });
    };

    const delayedHandler: Handler<T> = (resolve, reject, count) => {
        setTimeout(() => handler(resolve, reject, count), delay)
    };

    return new Promise(
        (resolve, reject) => delayedHandler(resolve, reject, 1)
    );
}



