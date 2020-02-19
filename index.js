'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
// #region Single Task Wrapper
var TaskCapsule = /** @class */ (function () {
    function TaskCapsule(func) {
        this.retryCounter = 0;
        this.exec = func;
    }
    TaskCapsule.prototype.run = function () {
        return this.exec();
    };
    return TaskCapsule;
}());
exports.TaskCapsule = TaskCapsule;
// #endregion
// #region Task Queues
var TaskQueue = /** @class */ (function () {
    function TaskQueue() {
        var _this = this;
        this.queue = [];
        this.errorStack = []; // errors occured while processing
        this.abortFlag = false; // is abort
        this.done = false; // has done
        this.onHandle = false; // is handlering
        this.total = 0;
        this.succeed = 0;
        this.failed = 0;
        this.onExecAmount = 0;
        this.__resolve = null;
        this.__reject = null;
        /**
         * Add a task to the queue
         * @param {TaskCapsule|function} task Task to be executed
         */
        this.add = function (task) {
            if (!(task instanceof TaskCapsule) && typeof task !== 'function') {
                throw new TypeError("Task must be an instance of type - <TaskCapsule> or a function with a Promise as it's return value.");
            }
            if (task instanceof TaskCapsule) {
                task.retryCounter = 0;
                _this.queue.push(task);
            }
            else {
                _this.queue.push(new TaskCapsule(task));
            }
        };
        this.__prepareToBegin = function () {
            if (!_this.onHandle) {
                _this.abortFlag = false;
                _this.done = false;
                _this.onHandle = true;
                _this.total = _this.queue.length;
                _this.succeed = 0;
                _this.failed = 0;
                _this.onExecAmount = 0;
                _this.errorStack = [];
                return true;
            }
            return false;
        };
        this.__execAmountChange = function (num) {
            _this.onExecAmount += num;
            if (_this.onExecAmount <= 0 && _this.queue.length === 0) {
                _this.__finish();
            }
        };
        this.__finish = function () {
            _this.onHandle = false;
            _this.done = true;
            var flag = _this.failed === 0;
            if (flag) {
                _this.__resolve();
            }
            else {
                _this.__reject(new Error("\n" + _this.errorStack
                    .map(function (_a, index) {
                    var stack = _a.stack;
                    return index + " - " + stack + "\n";
                })
                    .join('---------\n')));
            }
        };
    }
    TaskQueue.prototype.__consumeValid = function () {
        if (this.done) {
            if (this.onExecAmount > 0) {
                console.warn('Called consume after the tasks were handled.');
            }
            return false;
        }
        else if (this.abortFlag) {
            this.__finish();
            return false;
        }
        else if (this.queue.length === 0) {
            return false;
        }
        else {
            return true;
        }
    };
    TaskQueue.prototype.abort = function () {
        this.abortFlag = true;
    };
    return TaskQueue;
}());
var ParallelQueue = /** @class */ (function (_super) {
    __extends(ParallelQueue, _super);
    function ParallelQueue(_a) {
        var _b = _a.limit, limit = _b === void 0 ? 5 : _b, _c = _a.span, span = _c === void 0 ? 300 : _c, _d = _a.toleration, toleration = _d === void 0 ? 3 : _d;
        var _this = _super.call(this) || this;
        _this.__start = function () {
            if (_this.__consumeValid()) {
                if (_this.onExecAmount < _this.limitation && _this.queue.length > 0) {
                    var task_1 = _this.queue.shift();
                    _this.__execAmountChange(1);
                    task_1.run().then(function () {
                        // exec success
                        _this.succeed += 1;
                        _this.__execAmountChange(-1);
                    }, function (err) {
                        if (task_1.retryCounter >= _this.toleration) {
                            // retried many times still failed
                            _this.failed += 1;
                            _this.errorStack.push(err);
                        }
                        else {
                            // failed but retry it
                            task_1.retryCounter += 1;
                            _this.queue.unshift(task_1);
                        }
                        _this.__execAmountChange(-1);
                    });
                }
                if (_this.timespan > 0) {
                    setTimeout(_this.__start, _this.timespan);
                }
                else {
                    _this.__start();
                }
            }
        };
        _this.limitation = limit;
        _this.timespan = span;
        _this.toleration = toleration;
        return _this;
    }
    ParallelQueue.prototype.consume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.__resolve = resolve;
            _this.__reject = reject;
            if (_this.__prepareToBegin()) {
                if (_this.queue.length > 0) {
                    for (var _i = 0; _i < _this.limitation; _i += 1) {
                        _this.__start();
                    }
                }
                else {
                    _this.__execAmountChange(0);
                }
            }
            else {
                _this.__reject(new Error('Unable to consume'));
            }
        });
    };
    return ParallelQueue;
}(TaskQueue));
exports.ParallelQueue = ParallelQueue;
var SerialQueue = /** @class */ (function (_super) {
    __extends(SerialQueue, _super);
    function SerialQueue(_a) {
        var _b = _a.abortAfterFail, abortAfterFail = _b === void 0 ? false : _b, _c = _a.toleration, toleration = _c === void 0 ? 3 : _c;
        var _this = _super.call(this) || this;
        _this.abortAfterFail = abortAfterFail;
        _this.toleration = toleration;
        return _this;
    }
    SerialQueue.prototype.__start = function () {
        var _this = this;
        if (this.__consumeValid()) {
            this.__execAmountChange(1);
            var task_2 = this.queue.shift();
            task_2.run().then(function () {
                _this.succeed += 1;
                _this.__execAmountChange(-1);
                _this.__start();
            }, function (err) {
                if (task_2.retryCounter >= _this.toleration) {
                    // retried many times still failed
                    _this.failed += 1;
                    _this.errorStack.push(err);
                    if (_this.abortAfterFail) {
                        _this.__finish();
                        return false;
                    }
                }
                else {
                    // failed but retry it
                    task_2.retryCounter += 1;
                    _this.queue.unshift(task_2);
                }
                _this.__execAmountChange(-1);
                _this.__start();
            });
        }
    };
    SerialQueue.prototype.consume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.__resolve = resolve;
            _this.__reject = reject;
            if (_this.__prepareToBegin()) {
                if (_this.queue.length > 0) {
                    _this.__start();
                }
                else {
                    _this.__execAmountChange(0);
                }
            }
            else {
                _this.__reject(new Error('Unable to consume'));
            }
        });
    };
    SerialQueue.prototype.abort = function () {
        this.abortFlag = true;
    };
    return SerialQueue;
}(TaskQueue));
exports.SerialQueue = SerialQueue;
//# sourceMappingURL=index.js.map