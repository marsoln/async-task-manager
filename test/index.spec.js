const { assert } = require('chai')

const { TaskCapsule, ParallelQueue, SerialQueue } = require('../index')

const randomMs = () => Math.random() * 100
const emptyArr = new Array(10).fill('')

describe('Serial Queue with TaskCapsule', () => {
  it('Should worked well', async () => {
    const queue = new SerialQueue({ limit: 3 })
    emptyArr.forEach((_, index) => {
      queue.add(
        new TaskCapsule(
          () =>
            new Promise(resolve => {
              setTimeout(() => {
                console.log(`Task ${index} executed!`)
                resolve()
              }, randomMs())
            }),
        ),
      )
    })

    await queue.consume()
    return assert(queue.succeed === 10, 'Has 10 succeed result')
  })

  it('Should found errors', async () => {
    const queue = new SerialQueue({
      limit: 3,
      toleration: 0,
      abortAfterFail: false,
    })
    emptyArr.forEach((_, index) => {
      queue.add(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (index % 5 === 0) {
                console.log(`Task ${index} throw error...`)
                reject(new Error('TestError Message'))
              } else {
                console.log(`Task ${index} executed!`)
                resolve()
              }
            }, randomMs())
          }),
      )
    })
    await queue.consume().catch(() => {})
    return assert(queue.succeed === 8, 'Has 8 succeed result')
  })
})

describe('Parallel Queue with function', () => {
  it('Should worked well', async () => {
    const queue = new ParallelQueue({ limit: 3 })
    emptyArr.forEach((_, index) => {
      queue.add(
        () =>
          new Promise(resolve => {
            setTimeout(() => {
              console.log(`Task ${index} executed!`)
              resolve()
            }, randomMs())
          }),
      )
    })
    await queue.consume()
    return assert(queue.succeed === 10, 'Has 10 succeed result')
  })

  it('Should found errors', async () => {
    const queue = new ParallelQueue({ limit: 3 })
    emptyArr.forEach((_, index) => {
      queue.add(
        () =>
          new Promise((resolve, reject) => {
            setTimeout(() => {
              if (index % 5 === 0) {
                console.log(`Task ${index} throw error...`)
                reject(new Error('TestError Message'))
              } else {
                console.log(`Task ${index} executed!`)
                resolve()
              }
            }, randomMs())
          }),
      )
    })
    await queue.consume().catch(() => {})
    return assert(queue.succeed === 8, 'Has 8 succeed result')
  })
})
