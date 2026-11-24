# M02 Architecture Examples

Small Express and TypeScript servers for CS 4530, Module 2. Each folder is a
complete, independent project with its own `package.json`. Open the folder you
want, and run every `npm` command inside it.

| Folder                                   | What it is                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [counter-server/](counter-server/)       | Version 1. A tiny server with three modules: Controller, Auth and Counter.                                                       |
| [enrollment-server/](enrollment-server/) | Extension #1. A recreation-center enrollment app with a Service and a Repository. In progress: project scaffold and plan so far. |

To try the counter server:

```
cd counter-server
npm install
npm start
```

The git tag `v1-counter` marks the counter server as it was before the
extension was started.

[DECISIONS.md](DECISIONS.md) records every design decision made while building
these, with the alternatives considered and the reasons.
