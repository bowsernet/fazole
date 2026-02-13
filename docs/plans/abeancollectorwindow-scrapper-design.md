# abeancollectorswindow scrapper

this is my main source for ordering beans for growing: https://www.abeancollectorswindow.com/

I need to implement a scrapper that goes through all Beans and Network pages and imports individual varieties into our
database. The scrapper should be runnable incrementally (i.e. if new beans added onto the source pages, there are
imported)

Since they don't appear to have any unique ids exposed, let's just use the name as the unique ID.

Bean pages:

- https://www.abeancollectorswindow.com/beanpage.html
- https://www.abeancollectorswindow.com/beanpage1.html
- ...
- https://www.abeancollectorswindow.com/beanpage7.html

Network pages:

- https://www.abeancollectorswindow.com/networkpage1.html
- ...
- https://www.abeancollectorswindow.com/networkpage11.html

Implementation

- cloud function runs on demand via CLI with `gcloud functions call`
- the function scrapes all pages and imports new beans into our database
- only update if pages have changed (download html and compare hash with last known)
  - store hash in a collection (no permissions for frontend)
- ai agent should figure out the structure of the HTML files and how to extract the data
- reasonable rate limiting, it's about 20 pages in total, put 1 second in between requests
- on http error, retry 3 times with 10 seconds delay and abort if fails 3 times

Additional specifications

- download and store all scraped images locally (don't reference URLs from the source website)
- updates to existing beans: simply update attributes and images
- when deleted in the source, keep in our database but mark as "deleted in source"
- when bean is in both collections (bean and network pages), prefer bean page
