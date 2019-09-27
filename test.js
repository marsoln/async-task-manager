const { assert } = require('chai')
let { TaskCapsule, ParallelQueue, SerialQueue } = require('./src/index')

describe('Serial Queue', () => {
  it(
    'Should worked well',
    () => {
      let queue = new SerialQueue({ limit: 3 })
      new Array(10).fill('').forEach((_) => {
        queue.add(
          new TaskCapsule(
            () => new Promise((resolve) => {
              setTimeout(() => {
                // console.log(`Task ${index + 1} executed!`)
                resolve()
              }, Math.random() * 100)
            })
          )
        )
      })

      return queue.consume().then(() => { assert(queue.succeed === 10, 'Has 10 succeed result') })
    }
  )

  it(
    'Should found errors',
    () => {
      const queue = new SerialQueue({ limit: 3, toleration: 0, abortAfterFail: false })
      new Array(10).fill('').forEach((_, index) => {
        queue.add(
          () => new Promise((resolve, reject) => {
            setTimeout(() => {
              if (index % 5 === 0) {
                reject(new Error('test error'))
              } else {
                resolve()
              }
            }, Math.random() * 100)
          })
        )
      })
      return queue.consume().catch(err => {
        console.error(err)
        return assert(queue.succeed === 8, 'Has 8 succeed result')
      })
    }
  )
})

describe('Normal function task', () => {
  it(
    'Should worked well',
    () => {
      const queue = new ParallelQueue({ limit: 3 })
      new Array(10).fill('').forEach((_, index) => {
        queue.add(
          () => new Promise((resolve) => {
            setTimeout(() => {
              // console.log(`Task ${index + 1} executed!`)
              resolve()
            }, Math.random() * 100)
          })
        )
      })
      return queue.consume().then(() => assert(queue.succeed === 10, 'Has 10 succeed result'))
    }
  )

  it(
    'Should found errors',
    () => {
      const queue = new ParallelQueue({ limit: 3 })
      new Array(10).fill('').forEach((_, index) => {
        queue.add(
          () => new Promise((resolve, reject) => {
            setTimeout(() => {
              if (index % 5 === 0) {
                reject(new Error('test error'))
              } else {
                resolve()
              }
            }, Math.random() * 100)
          })
        )
      })
      return queue.consume().catch(err => {
        console.error(err)
        return assert(queue.succeed === 8, 'Has 8 succeed result')
      })
    }
  )
})
