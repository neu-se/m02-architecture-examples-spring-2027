# Purpose

I want a very tiny web server to use as an example in my CS 4530 Software Engineering class

# Satisfaction Conditions:
Satisfaction condition: when called, the server sends a response that tells how many times it’s been called by an authorized user
Satisfaction condition: the server will accept direct calls with an http payload
Satisfaction condition: the server will be divided into to task-oriented modules with interfaces that enforce separation of concerns and information-hiding
Satisfaction condition: it should be easy for me to write and for students to understand.

# Organization

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






