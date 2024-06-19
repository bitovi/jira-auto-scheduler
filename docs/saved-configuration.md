# Saved Configuration

To save team settings so they are the default for all users of the tool, create a `Jira Auto Scheduler Configuration` issue that has a table in the description as follows:

> ![image](https://github.com/bitovi/jira-auto-scheduler/assets/78602/bd28b063-cc0d-4d30-8668-0151898f99c8)

You can copy the table below into Jira for a starting point.

| **Team**  | **Velocity** | **Tracks** | **Sprint Length** |
| :-------- | :----------- | :--------- | :---------------- |
| STORE     | 10           | 1          | 10                |
| ORDER     | 20           | 2          | 10                |
| MARKETING | 30           | 2          | 10                |


The table only needs to include a `team` column and one of the other column names. This means if you only want to specify velocity, you can have a two-column table.

| Team  | Velocity |
| :---- | :------- |
| STORE | 60       |
| ORDER | 50       |
