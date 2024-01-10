# Statistical AutoScheduler for Jira

The [Statistical AutoScheduler](https://auto-scheduler.bitovi-jira.com/) is used to build probabilistic plans. Probabilistic plans account for uncertainty in estimating. The Statistical AutoScheduler produces a roadmap of epics as probability distribution:

![Jira_Auto_Scheduler](https://github.com/bitovi/jira-auto-scheduler/assets/78602/3bbcf77f-fa9e-42ab-9688-b90383253e59)

[See it in action with mock data here!](https://auto-scheduler.bitovi-jira.com/)

## Features

- Loads epics from Jira and writes epic `Start date` and `Due date` to Jira.
- Supports multiple teams, team velocities, and tracks within a team.
- Specify the probability threshold to adjust to your risk tolerances
- Supports a wide variety of Jira configuration settings

## Need help or have questions?

This project is supported by [Bitovi, an Agile Project Management consultancy](https://www.bitovi.com/services/agile-project-management-consulting). You can get help or connect on our:

- [LinkedIn](https://www.linkedin.com/company/bitovi/)
- [Discord](https://discord.gg/J7ejFsZnJ4)
- [Twitter](https://twitter.com/bitovi)

Or, attend our next free & public [training](https://www.bitovi.com/events/program-management-webinar).

Or, you can [hire us](https://www.bitovi.com/services/agile-project-management-consulting) for training, consulting, or program management.

## Why 

![image](https://github.com/bitovi/jira-auto-scheduler/assets/78602/d7d952ac-f6c7-4435-9684-b0995ce3623a)

Accurate estimation is hard! But, [estimation is important](https://www.bitovi.com/academy/learn-agile-program-management-with-jira/estimating.html#why-estimate) because
it helps to know the cost of an initiative when prioritizing it.

Most teams build roadmaps by breaking down the work, getting a __single-time__ (or time-adjacent) __estimate__ of each work item, and sum up the work items to arrive at a due date. These dates never turn out to be accurate. This is for two reasons:

1. Getting a single-time-estimate hides the uncertainty present in the estimate.  A estimate of 2 weeks of 10% certainty is widely different than an estimate of 2 weeks with 90% certainty.
2. Software work has a [log-normal blow-up factor that needs to be accounted for](https://erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html).

The Statistical AutoScheduler accounts for both of these points.

Finally, even with improved modeling, a single due date can never be provided.  Instead, decisions should be made with an understanding of the inherent uncertainty. The Statistical AutoScheduler provides probabilities over a range of dates. For example, while the average due date is March 6th, there's still a 10% chance the work will extend beyond April 2nd:

![Jira_Auto_Scheduler](https://github.com/bitovi/jira-auto-scheduler/assets/78602/e15fd818-e08c-43c6-8dbe-0eebab727e60)

Ultimately, using the AutoScheduler provides both:

- More accurate roadmaps
- And, plans that properly reflect uncertainty

... which helps teams make more informed decisions.

## How it works

The Statistical AutoScheduler loads a list of epics from Jira containing:

- An estimate in story points.
- A confidence from 10 to 100%.
- A list of blockers

Then, given the team velocities provided to the app, it:

1. For each epic, randomly selects a "work time" based on the log-normal probability distribution of the epic's estimate and confidence
2. Schedules out the epics using the following algorithm:
    1. Identify the longest critical path based on blockers
    2. Schedule those epics in the first space allotted for the epic's team
    3. Repeat
3. Finally, it repeats the scheduling algorithm __5000 times__, arriving at a probability distribution for the work as a whole


For more background, check out:

- [Why software projects take longer than you think: a statistical model](https://erikbern.com/2019/04/15/why-software-projects-take-longer-than-you-think-a-statistical-model.html)
- [Statistical Software Estimator](https://bitovi.github.io/statistical-software-estimator/)

## Use

To learn how to use this in context, read the full [Agile Program Management with Jira Training](https://www.bitovi.com/academy/learn-agile-program-management-with-jira.html).

The following Quick Start video shows how:

- [0:10](https://youtu.be/wNOrmthMnFA?t=10) - Adding the `Story points median` and `Story points confidence` fields.
- [1:25](https://youtu.be/wNOrmthMnFA?t=85) - Creating the initial epics we will use for the roadmap
- [1:53](https://youtu.be/wNOrmthMnFA?t=113) - Adding the `Story points median`, `Story points confidence` and `Story point estimate` fields to the Epics screen.
- [2:43](https://youtu.be/wNOrmthMnFA?t=163) - Adding `Story points median` and `Story points confidence` values to epics.
- [4:08](https://youtu.be/wNOrmthMnFA?t=248) - Connecting the Statistical Auto Scheduler to your Jira instance.
- [4:27](https://youtu.be/wNOrmthMnFA?t=267) - Exploring the results.
- [5:10](https://youtu.be/wNOrmthMnFA?t=310) - Configuring the Statistical Auto Scheduler to write adjusted story points to the `Story point estimate` field.
- [5:36](https://youtu.be/wNOrmthMnFA?t=336) - Saving the plan back to Jira


[![Quick Start Statistical Auto Scheduler](https://github.com/bitovi/jira-auto-scheduler/assets/78602/aeab9a66-1f22-4e07-aeb3-69144e4d7e94 'Quick Start Statistical Auto Scheduler')]([https://codecademy.com](https://youtu.be/wNOrmthMnFA))



To use it with its default configuration, you need to create and add the following fields to all epics:

- `Story points median`
- `Story points confidence` 

Make sure these fields and the following fields are added to the Epic screens too:

- `Start date`
- `Due date`


