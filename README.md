# async-task-manager

> asynchronous tasks execution manager  

## Usage

`npm install --save async-task-manager`

```javascript

import { TaskCapsule, ParallelQueue } from 'async-task-manager'

let queue = new ParallelQueue({
  limit: 3, // parallel limitation
})

new Array(10).fill('').forEach((_, index) => {
  queue.add(
    new TaskCapsule(
      // A function return Promise<T>
      () => new Promise((resolve) => {
        setTimeout(() => {
          console.log(`Task ${index + 1} executed!`)
          resolve()
        }, Math.random() * 1000)
      })
    )
  )
})

queue.consume().then(() => console.log('finished'))

```

Result look like this

```bash
  Task 1 executed!
  Task 2 executed!
  Task 0 executed!
  Task 5 executed!
  Task 3 executed!
  Task 4 executed!
  Task 6 executed!
  Task 8 executed!
  Task 7 executed!
  Task 9 executed!
  finished
```
