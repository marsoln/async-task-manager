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
  constructor() {
    this.queue = [] // task queue
    this.errorStack = [] // errors occured while processing
    this[abort] = false // is abort
    this.done = false // has done
    this.onHandle = false // is handlering
    this.total = 0
    this.succeed = 0
    this.failed = 0
    this.onExecAmount = 0
    this.__resolve = null
    this.__reject = null
  }

  /**
   * Add a task to the queue
   * @param {TaskCapsule|function} task Task to be executed
   */
  add(task) {
    if (!(task instanceof TaskCapsule) && typeof task !== 'function') {
      throw new TypeError('Task must be an instance of type - <TaskCapsule> or a function with a Promise as it\'s return value.')
    }

    if (task instanceof TaskCapsule) {
      task[retry] = 0
      this.queue.push(task)
    } else {
      this.queue.push({ run: task, [retry]: 0 })
    }
  }

  [prepareToBegin]() {
    if (!this.onHandle) {
      this[abort] = false
      this.done = false
      this.onHandle = true
      this.total = this.queue.length
      this.succeed = 0
      this.failed = 0
      this.onExecAmount = 0
      this.errorStack = []
      return true
    }
    return false
  }

  [execAmountChange](num) {
    // console.debug(`exec amount changed: ${num}`)
    this.onExecAmount += num
    if (this.onExecAmount <= 0 && this.queue.length === 0) {
      this[finish]()
    }
  }

  [consumeValid]() {
    if (this.done) {
      if (this.onExecAmount > 0) {
        console.info('Called consume after the tasks were handled. Thats\'s all right.')
      }
      return false
    } else if (this[abort]) {
      this[finish]()
      return false
    } else if (this.queue.length === 0) {
      return false
    } else {
      return true
    }
  }

  [finish]() {
    this.onHandle = false
    this.done = true
    const flag = this.failed === 0
    if (flag) {
      this.__resolve.call(this)
    } else {
      this.__reject.call(this, new Error(`\n${'-'.repeat(30)}\n${this.errorStack.map(({ stack }, index) => `${index} - ${stack}\n`).join('-'.repeat(30) + '\n')}`))
    }
  }

  abort() {
    this[abort] = true
  }
}

class ParallelQueue extends TaskQueue {
  constructor({ limit = 5, span = 300, toleration = 3 }) {
    super()
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
            this.succeed += 1
            this[execAmountChange](-1)
          })
          .catch((err) => {
            if (task[retry] >= this.toleration) {
              // retried many times still failed
              this.failed += 1
              this.errorStack.push(err)
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
        this.__reject(new Error('Unable to consume'))
      }
    })
  }
}

class SerialQueue extends TaskQueue {
  constructor({ abortAfterFail = false, toleration = 3 }) {
    super()
    this.abortAfterFail = abortAfterFail
    this.toleration = toleration
  }

  [start]() {
    if (this[consumeValid]()) {
      this[execAmountChange](1)
      let task = this.queue.shift()
      task.run()
        .then(() => {
          this.succeed += 1
          this[execAmountChange](-1)
          this[start].call(this)
        })
        .catch((err) => {
          if (task[retry] >= this.toleration) {
            // retried many times still failed
            this.failed += 1
            this.errorStack.push(err)
            if (this.abortAfterFail) {
              this[finish]()
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
        this.__reject(new Error('Unable to consume'))
      }
    })
  }

  abort() {
    this[abort] = true
  }
}

// #endregion

exports.TaskCapsule = TaskCapsule
exports.ParallelQueue = ParallelQueue
exports.SerialQueue = SerialQueue
