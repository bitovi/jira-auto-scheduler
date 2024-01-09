# Statistical AutoScheduler for Jira

The [Statistical AutoScheduler](https://auto-scheduler.bitovi-jira.com/) is used to build probabilistic plans. Probabilistic plans account for uncertainty in estimating. The Statistical AutoScheduler produces a roadmap of epics as probability distribution:

![Jira_Auto_Scheduler](https://github.com/bitovi/jira-auto-scheduler/assets/78602/3bbcf77f-fa9e-42ab-9688-b90383253e59)

[See it in action with mock data here!](https://auto-scheduler.bitovi-jira.com/)

## Features

- Loads epics from Jira and writes epic `Start date` and `Due date` to Jira.
- Supports multiple teams, team velocities, and tracks within a team.
- Specify the probability threshold to adjust to your risk tolerances
- Supports a wide variety of Jira configuration settings

## Why Use 

![image](https://github.com/bitovi/jira-auto-scheduler/assets/78602/d7d952ac-f6c7-4435-9684-b0995ce3623a)

Accurate estimation is hard! But, [estimation is important](https://www.bitovi.com/academy/learn-agile-program-management-with-jira/estimating.html#why-estimate) because
it helps to know the cost of an initiative when prioritizing it.

Most teams build roadmaps by breaking down the work, getting a __single-time__ (or time-adjacent) __estimate__ of each work item, and sum up the work items to arrive at a due date. These dates never turn out to be accurate. This is for two reasons:

1. Getting a single-time-estimate hides the uncertainty present in the estimate.  A estimate of 2 weeks of 10% certainty is widely different than an estimate of 2 weeks with 90% certainty.
2. Software work has a [log-normal blow-up factor that needs to be accounted for](https://erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html).

The Statistical AutoScheduler accounts for both of these points.

Finally, even with improved modeling, a single due date can never be provided.  Instead, decisions should be made with an understanding of the inherent uncertainty. The Statistical AutoScheduler provides probabilities over a range of dates. For example, while the average due date is March 6th, there's still a 10% chance the work will extend beyond April 2nd:

![Jira_Auto_Scheduler](https://github.com/bitovi/jira-auto-scheduler/assets/78602/e15fd818-e08c-43c6-8dbe-0eebab727e60)


## How it works

The Statistical AutoScheduler loads a list of epics from Jira containing:

- An estimate in story points.
- A confidence from 10 to 100%.
- A list of blockers

Then, given the team velocities provided to the app, it:

1. For each epic, randomly selects a "work time" based on the log-normal probability distribution of the epic's estimate and confidence.


