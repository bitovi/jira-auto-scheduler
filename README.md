# jira-auto-scheduler
A JIRA auto-scheduling application for product management

# How to retrieve CSV from Jira
1) On the navigation bar of Jira select "Filters. You can view your recent filters, see all filters or do an advance issue search.
2) Select view all filters from the dropdown. You can select an exisiting filter or create a new one with the criterias you'd like.
3) Select a filter.
4) Select "Export" and in the dropdown menu select the file format of CSV.

# How to create a new Filter

1) On the navigation bar of Jira select "Filters"
2) Select view all filters from the dropdown.
3) Select "Create Filters", you will create a filter containing all the tickets within a single project.
4) On the project dropdown select a project you'd like to have a filter for.
5) Select "Save as" and name the filter and select submit

# How to run locally
1) Navigate to the root directory of jira-auto-scheduler
2) Install python
3) Create a local server using python, in your terminal if you are using python version is 2.x run the following `python -m SimpleHTTPServer` if it's 3.x then you will run `python3 -m http.server` which generates the local server and the port will be assigned which is usually `8000`
4) Navigate to your newly generated local server in the browser `localhost:8000` in this case.