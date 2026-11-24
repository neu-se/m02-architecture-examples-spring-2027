# Purpose

I want a very tiny web server to use as an example in my CS 4530 Software Engineering class

# Satisfaction Conditions:
Satisfaction condition: when called, the server sends a response that tells how many times it’s been called by an authorized user
Satisfaction condition: the server will accept direct calls with an http payload
Satisfaction condition: the server will be divided into task-oriented modules with interfaces that enforce separation of concerns and information-hiding
Satisfaction condition: it should be easy for me to write and for students to understand.
Satisfaction condition (Extension #1): each new module is readable on one screen, like the version 1 files.

# Organization

The sections below describe version 1 (the counter), which lives in
`counter-server/` and is deliberately kept free of the extension's
complications. Extension #1 lives in `enrollment-server/`, an independent
project (its own package.json, no npm workspaces) that starts from the
counter's project setup. It adds a Service module (the business rules) and a
Repository module (async persistence over Keyv), and its Auth has an
`authenticate()` that returns an identity. Run `npm` commands inside the
folder of the app you are working on. See enrollment-server/EXTENSION-1-PLAN.md
for the design and DECISIONS.md for why.

## Controller module: 

accepts http requests, and validates that they are of the proper form.  Calls the Auth module to validate the requestor.  If the request is from a valid user, passes the request to the Counter module. Takes the result supplied by the counter module and sends reply to the requestor.

Uses Zod to validate the body of the request is well-formed



## Auth module

Given a validated request, determines whether it is from an authorized user.

Start with a single very simple authorized user/password pair.

## Counter Module

When it is called, returns the total number of times it has been called (including this one).


# Tech Stack

We will use Typescript, Express, vitest, Stryker, and Supertest.

# Interaction

Please record all decisions that we make along the way in a reusable form.

# Extension #1

The purpose of this extension is to provide a plausible setting to illustrate
. a service layer with some business logic
. a persistent repository layer with an async interface.
. The YAGNI principle

## Scenario

We are building an app to keep track of students enrolling in activities in a recreation center.

We will have students and activities.

We are only keeping track of one semester's activities.  Students can sign up for an activity for that semester.

The business rules are:
1. Students may be signed up for at most 3 activities at any time.
2. A student may drop an activity, but if they do so, they may not sign up for that same activity again.

We will need endpoints for the following:
. create an activity
. create a student
. a student signs up for an activity.  Both the student and the activity must have been previously created.
. a student drops an activity.

### Authority

Anyone can create a student.  The creator gets to specify the student's login name and password.  Duplicate names are not allowed.

There is a distinguished login called 'admin'; only the admin can create activities.








