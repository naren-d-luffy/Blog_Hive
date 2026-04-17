# API Guide

This project currently uses Postman as the API source of truth.

- Collection file: `doc/Blog Backend.postman_collection.json`

## Base Path

- `/api/v1`

## Authentication Model

- Login endpoints return:
  - access token in response body
  - refresh token in `httpOnly` cookie
  - csrf token in readable cookie
- Protected routes require `Authorization: Bearer <accessToken>`
- CSRF-protected routes require `x-csrf-token` header and valid refresh cookie

## Main Route Groups

- `/admin`
- `/user`
- `/tokens`
- `/blog`
- `/logs`