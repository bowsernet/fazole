# Spec Depraceted

sections of the spec no longer useful

- the whole implementation/task/code review workflow. This is all redundant covered with `superpowers`

## Implementation workflow

The are the following major steps:

1. Write the specification (user & assistent collaboration)
2. Prepare detailed todo list in a separate document (`todo.md`) that covers the whole specification

- each individual item should be self contained and have the app in a working state after completion (except maybe for
  initial setup tasks). There will be an index of all items at the beginning of the document (a simple unordered list).
  with tasks marked as completed or not.
- let's be diligent about separating coding tasks and setup/dev-ops tasks. Let's try to do all necessary 3rd party setup
  (firebase etc.)at the beginning. Code dependencies should be installed as they are needed. Don't consider npm installs
  as setup tasks, those are part of the coding tasks, except for the initial setup where there will be a lot of them at
  once.

Only the index will be used to track progress. It always needs to stay in sync with the todo list.

### Todo.md example

```
# Todo

## Todo Index

- [x] first task
- [x] second task
- [ ] third task

----

## First Task

First task spec

## Second task

Second task spec

...
```

3. Implementation

- todo items will be implemented one by one utilizing pair programming (the pair being me and the assistent)
- each task implemetation will start with a new prompt. Unless stated otherwise, the assistent will implement and I'll
  code review (but might be the opposite). The prompt will simply reference the todo item by it's name.
- As a first step of each task implementation, task spec document will be created, named `<number>-task-title.md` (
  numbering is used for simple task sorting, will be three digit and start at `001`).
- The document will have three main sections: `General notes`, `Specification` and `Implementation`.
  - General notes will reference the complete spec, the high level todo list `todo.md`, coding guidelines, and state
    some basic rules, it'll always be the same.
  - Specification will be created based on the task description in the main spec. It should be concise and
    self-contained (but more detailed than the description in the main spec). It should reference the major files/paths
    affected, break up the task into it's own little todo list if justified by the scope.
  - Implementation notes will be added to the task spec document after each task implementation (empty at the
    beginning). The assistant will usually fill the implementation notes even if the user is the programmer and the
    assistant the reviewer in the pair-programming session.
- The initial state of the document will simpy be a copy of `000-task-template.md` with task title (`## Task Title`)
  replaced by the actual task title

### Code review

The other party will review the code and provide feedback. The task spec document will be updated accordingly. Both
Specification and Implementation may be updated during the review to reflect both requirement changes and the actual
implementation.

When finished, both the initial spec document and the main todo list might be updated if requirements change. In the
main todo list, the task will be marked as completed.

I'll commit the changes after the review.

### New tasks

A new task might be added at any time during implementation. It can either be appended at the end of the main todo list
or in the middle (if it's a prerequisite for another task). Only the main todo list will be updated (because the task
specification documents are created only when new task is started).

There's no end point for the project, it'll evolve over time.
