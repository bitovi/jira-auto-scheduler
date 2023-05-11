# jira-auto-scheduler

A JIRA auto-scheduling application for product management.

## Features

- Indicate confidence and estimate
- Make it so a team can have epics in parallel
- Add time and sprints
- Working days
- Start date and end date

# Deploying this app

This repo is set up with three GitHub Actions:

## Deploy-PR

1. This action runs *automatically* when any commit is pushed to a PR.
1. Each PR will create its own deployment "environment".

## Destroy-PR

1. This action runs *automatically* when any PR is closed.
1. It tears down the PR's deployed environment.

## Deploy

1. This action runs *automatically* on any commit to `main`.
1. It performs a new deploy to the existing `main` environment.

# Deployment Info

## Where is the app deployed?

The apps get deployed to the Bitovi AWS instance **jira-integrations**.

The Action creates an EC2 VM, installs docker on it, and then launches the application using `docker-compose`.

The public URL of the application is displayed in the Summary tab of an Action's run.

# Contact

For application code questions, please raise an issue in this repo.

Questions or comments about the app's deployment/operations can be aimed at the [devops team](mailto:devops@bitovi.com)!
