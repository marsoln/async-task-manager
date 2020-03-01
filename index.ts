'use strict'

type CapsuleFunc = () => Promise<any>

const retryCounter = Symbol('retryCounter')

// #region Task Queues

class TaskQueue {
  queue: CapsuleFunc[] = []
  errorStack: Error[] = [] // errors occured while processing
  _abortFlag: boolean = false // is abort
  _doneFlag = false // has done
  _handleFlag = false // is handlering
  total: number = 0
  succeed: number = 0
  failed: number = 0
  executed: number = 0

  toleration: number = 0

  __resolve?: Function = null
  __reject?: Function = null

  constructor(toleration: number = 3) {
    this.toleration = toleration
  }

  /**
   * Add a task to the queue
   * @param {TaskCapsule|function} task Task to be executed
   */
  add = (task: CapsuleFunc) => {
    task[retryCounter] = 0
    this.queue.push(task)
  }

  __prepareToBegin = () => {
    if (!this._handleFlag) {
      this._abortFlag = false
      this._doneFlag = false
      this._handleFlag = true
      this.total = this.queue.length
      this.succeed = 0
      this.failed = 0
      this.executed = 0
      this.errorStack = []
      return true
    }
    return false
  }

  __execAmountChange = (num: number) => {
    this.executed += num
    if (this.executed <= 0 && this.queue.length === 0) {
      this.__finish()
    }
  }

  __consumeValid() {
    if (this._doneFlag) {
      if (this.executed > 0) {
        console.warn('Called consume after the tasks were handled.')
      }
      return false
    } else if (this._abortFlag) {
      this.__finish()
      return false
    } else if (this.queue.length === 0) {
      return false
    } else {
      return true
    }
  }

  __finish = () => {
    this._handleFlag = false
    this._doneFlag = true
    const flag = this.failed === 0
    if (flag) {
      this.__resolve()
    } else {
      this.__reject(this.errorStack)
    }
  }

  abort() {
    this._abortFlag = true
  }
}

type ParallelQueueArguments = {
  limit?: number
  toleration?: number
  span?: number
}

export class ParallelQueue extends TaskQueue {
  limitation: number
  timespan: number

  constructor({ limit = 5, span = 300, toleration }: ParallelQueueArguments) {
    super(toleration)
    this.limitation = limit
    this.timespan = span
  }

  __start = () => {
    if (this.__consumeValid()) {
      if (this.executed < this.limitation && this.queue.length > 0) {
        let task = this.queue.shift()
        this.__execAmountChange(1)
        task().then(
          () => {
            // exec success
            this.succeed += 1
            this.__execAmountChange(-1)
          },
          err => {
            if (task[retryCounter] >= this.toleration) {
              // retried many times still failed
              this.failed += 1
              this.errorStack.push(err)
            } else {
              // failed but retry it
              task[retryCounter] += 1
              this.queue.unshift(task)
            }
            this.__execAmountChange(-1)
          },
        )
      }
      if (this.timespan > 0) {
        setTimeout(this.__start, this.timespan)
      } else {
        this.__start()
      }
    }
  }

  consume() {
    return new Promise((resolve: Function, reject: Function) => {
      this.__resolve = resolve
      this.__reject = reject
      if (this.__prepareToBegin()) {
        if (this.queue.length > 0) {
          for (let _i = 0; _i < this.limitation; _i += 1) {
            this.__start()
          }
        } else {
          this.__execAmountChange(0)
        }
      } else {
        this.__reject(new Error('Unable to consume'))
      }
    })
  }
}

type SerialQueueArguments = {
  abortAfterFail?: boolean
  toleration?: number
}

export class SerialQueue extends TaskQueue {
  abortAfterFail: boolean

  constructor({ abortAfterFail = false, toleration }: SerialQueueArguments) {
    super(toleration)
    this.abortAfterFail = abortAfterFail
  }

  __start() {
    if (this.__consumeValid()) {
      this.__execAmountChange(1)
      let task = this.queue.shift()
      task().then(
        () => {
          this.succeed += 1
          this.__execAmountChange(-1)
          this.__start()
        },
        err => {
          if (task[retryCounter] >= this.toleration) {
            // retried many times still failed
            this.failed += 1
            this.errorStack.push(err)
            if (this.abortAfterFail) {
              this.__finish()
              return false
            }
          } else {
            // failed but retry it
            task[retryCounter] += 1
            this.queue.unshift(task)
          }
          this.__execAmountChange(-1)
          this.__start()
        },
      )
    }
  }

  consume() {
    return new Promise((resolve, reject) => {
      this.__resolve = resolve
      this.__reject = reject
      if (this.__prepareToBegin()) {
        if (this.queue.length > 0) {
          this.__start()
        } else {
          this.__execAmountChange(0)
        }
      } else {
        this.__reject(new Error('Unable to consume'))
      }
    })
  }

  abort() {
    this._abortFlag = true
  }
}

// #endregion
