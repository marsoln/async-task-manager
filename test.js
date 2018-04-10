const { assert } = require('chai')
let { TaskCapsule, ParallelQueue } = require('./src/index')

describe('并行队列', () => {
  let queue = new ParallelQueue({ limit: 3 })
  new Array(10).fill('').forEach((_, index) => {
    queue.add(
      new TaskCapsule(
        () => new Promise((resolve) => {
          setTimeout(() => {
            console.log(`Task ${index + 1} executed!`)
            resolve()
          }, Math.random() * 100)
        })
      )
    )
  })

  it(
    '应该正常执行',
    () => queue.consume().then(() => { assert(queue.succ === 10, '应该有 10 条成功记录') })
  )
})
