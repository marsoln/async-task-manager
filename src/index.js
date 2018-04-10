'use strict'

const start = Symbol('start')
const retry = Symbol('retry')
const abort = Symbol('abort')
const finish = Symbol('finish')

const prepareToBegin = Symbol('prepareToBegin')
const execAmountChange = Symbol('execAmountChange')
const consumeValid = Symbol('consumeValid')

// #region Single Task Wrapper

class TaskCapsule {
  // func must be an asynchronized function
  // if it's not
  // why you need task queue?
  constructor(func, ctx, ...args) {
    this.exec = func
    this.ctx = ctx
    this.args = args
    this[retry] = 0
  }

  run() {
    return this.exec.apply(this.ctx || this, this.args)
  }
}

// #endregion

// #region Task Queues

class TaskQueue {
  constructor({ onFinished }) {
    this.queue = [] // task queue
    this[abort] = false // is abort
    this.done = false // has done
    this.onHandle = false // is handlering
    this.total = 0
    this.succ = 0
    this.fail = 0
    this.onExecAmount = 0
    this.onFinished = onFinished
    this.__resolve = null
    this.__reject = null
    this.__promise = new Promise((resolve, reject) => {
      this.__resolve = resolve
      this.__reject = reject
    })
  }

  add(task) {
    if (!(task instanceof TaskCapsule)) {
      throw new TypeError('Task must be an instance of type - <TaskCapsule>.')
    }
    this.queue.push(task)
  }

  [prepareToBegin]() {
    if (!this.onHandle) {
      this[abort] = false
      this.done = false
      this.onHandle = true
      this.total = this.queue.length
      this.succ = 0
      this.fail = 0
      this.onExecAmount = 0
      return true
    }
    return false
  }

  [execAmountChange](num) {
    this.onExecAmount += num
    if (this.onExecAmount <= 0 && this.queue.length === 0) {
      this[finish](true)
    }
  }

  [consumeValid]() {
    if (this.done) {
      if (this.onExecAmount > 0) {
        console.info('Called consume after the tasks were handled. Thats\'s all right.')
      }
      return false
    } else if (this[abort]) {
      console.warn('Tasks abort.')
      this[finish](false)
      return false
    } else if (this.queue.length === 0) {
      return false
    } else {
      return true
    }
  }

  [finish](flag) {
    this.onHandle = false
    this.done = true
    if (flag && this.__resolve && this.succ === this.total) {
      this.__resolve.call(this)
    } else if (this.__reject) {
      this.__reject.call(this)
    }
    if (this.onFinished) {
      this.onFinished.call(this)
    }
  }

  abort() {
    this[abort] = true
  }

  flush() {
    this.queue = []
  }
}

class ParallelQueue extends TaskQueue {
  constructor({ limit = 5, span = 300, toleration = 3, onFinished }) {
    super({ onFinished })
    this.limitation = limit
    this.timespan = span
    this.toleration = toleration
  }

  [start]() {
    if (this[consumeValid]()) {
      if (this.onExecAmount < this.limitation && this.queue.length > 0) {
        let task = this.queue.shift()
        this[execAmountChange](1)
        task
          .run()
          .then(() => {
            // exec success
            this.succ += 1
            this[execAmountChange](-1)
          })
          .catch((e) => {
            if (task[retry] >= this.toleration) {
              // retried many times still failed
              this.fail += 1
            } else {
              // failed but retry it
              task[retry] += 1
              this.queue.unshift(task)
            }
            this[execAmountChange](-1)
          })
      }
      if (this.timespan > 0) {
        setTimeout(this[start].bind(this), this.timespan)
      } else {
        this[start].call(this)
      }
    }
  }

  consume() {
    return new Promise((resolve, reject) => {
      this.__resolve = resolve
      this.__reject = reject
      if (this[prepareToBegin]()) {
        if (this.queue.length > 0) {
          for (let _i = 0; _i < this.limitation; _i += 1) {
            this[start]()
          }
        } else {
          this[execAmountChange](0)
        }
      } else {
        this.__reject(new Error('not able to consume'))
      }
    })
  }
}

class SerialQueue extends TaskQueue {
  constructor({ abortAfterFail = false, toleration = 3, onFinished }) {
    super({ onFinished })
    this.abortAfterFail = abortAfterFail
    this.toleration = toleration
  }

  [start]() {
    if (this[consumeValid]()) {
      this[execAmountChange](1)
      let task = this.queue.shift()
      task.run()
        .then(() => {
          this.succ += 1
          this[execAmountChange](-1)
          this[start].call(this)
        })
        .catch(() => {
          if (task[retry] >= this.toleration) {
            // retried many times still failed
            this.fail += 1
            if (this.abortAfterFail) {
              this[finish](false)
              return false
            }
          } else {
            // failed but retry it
            task[retry] += 1
            this.queue.unshift(task)
          }
          this[execAmountChange](-1)
          this[start].call(this)
        })
    }
  }

  consume() {
    return new Promise((resolve, reject) => {
      this.__resolve = resolve
      this.__reject = reject
      if (this[prepareToBegin]()) {
        if (this.queue.length > 0) {
          this[start]()
        } else {
          this[execAmountChange](0)
        }
      } else {
        this.__reject(new Error('not able to consume'))
      }
    })
  }

  abort() {
    this[abort] = true
  }

  flush() {
    this.queue = []
  }
}

// #endregion

exports.TaskCapsule = TaskCapsule
exports.ParallelQueue = ParallelQueue
exports.SerialQueue = SerialQueue
