const { assert } = require('chai')
let { TaskCapsule, ParallelQueue } = require('./src/index')

describe('Serial Queue', () => {
  let queue = new ParallelQueue({ limit: 3 })
  new Array(10).fill('').forEach((_, index) => {
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

  it(
    'Should worked well',
    () => queue.consume().then(() => { assert(queue.succeed === 10, 'Has 10 succeed result') })
  )
})

describe('Normal function task', () => {
  let queue = new ParallelQueue({ limit: 3 })
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

  it(
    'Should worked well',
    () => queue.consume().then(() => { assert(queue.succeed === 10, 'Has 10 succeed result') })
  )
})
