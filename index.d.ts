declare type CapsuleFunc = () => Promise<any>;
export declare class TaskCapsule {
    exec: CapsuleFunc;
    retryCounter: number;
    constructor(func: CapsuleFunc);
    run(): Promise<any>;
}
declare class TaskQueue {
    queue: TaskCapsule[];
    errorStack: Error[];
    abortFlag: boolean;
    done: boolean;
    onHandle: boolean;
    total: number;
    succeed: number;
    failed: number;
    onExecAmount: number;
    __resolve?: Function;
    __reject?: Function;
    /**
     * Add a task to the queue
     * @param {TaskCapsule|function} task Task to be executed
     */
    add: (task: TaskCapsule | CapsuleFunc) => void;
    __prepareToBegin: () => boolean;
    __execAmountChange: (num: number) => void;
    __consumeValid(): boolean;
    __finish: () => void;
    abort(): void;
}
export declare class ParallelQueue extends TaskQueue {
    limitation: number;
    timespan: number;
    toleration: number;
    constructor({ limit, span, toleration }: {
        limit?: number;
        span?: number;
        toleration?: number;
    });
    __start: () => void;
    consume(): Promise<unknown>;
}
export declare class SerialQueue extends TaskQueue {
    abortAfterFail: boolean;
    toleration: number;
    constructor({ abortAfterFail, toleration }: {
        abortAfterFail?: boolean;
        toleration?: number;
    });
    __start(): void;
    consume(): Promise<unknown>;
    abort(): void;
}
export {};
//# sourceMappingURL=index.d.ts.map