## Twitter Tags
This project was created as a solution for the 'twitter tags' challenge of the 2nd CodeSprint hosted by [Interviewstreet](http://interviewstreet.com). Twitter Tags is a web service that provides a set of weighted tags based on a search key word. A demonstration can be found here: http://maklesoft.com/twittertags/examples/force/

Author: [Martin Kleinschrodt](https://github.com/MaKleSoft)

##Requirements
The entire webservice runs with PHP.
Pretty much the only special requirement is that CURL
is installed on the server (http://www.php.net/manual/en/curl.setup.php);

## API
For a detailed description of the parameters, look at the documentation of the index.php.

## Notes
The tag cloud is based on the information returned by the twitter
search api. By default the service only requests 100 tweets from
the api (for performance reasons). For more tweets and thus a more
accurate tag cloud simply specify the parameter n_search (default 1).
The service will then request n_search * 100 tweets from the api.

In order to find tags and weight them appropriately the service
extracts information from the following data:
- Tweet contents
- Metadata from url entities (title, keywords, description)
- Metadata from media entitites (title, keywords, description)

In order to fine tune the tag weighting the following factors can
be set in the index.php:
- content weighting
- url keyword weighting
- url title weighting (set to 0 by default)
- url description weighting

## Known Issues
- For some reason in the html visualization one tag occurs twice
and another one is omitted. This problem is not present in the json
representation.
- Error handling in this version is pretty much non-existent. Well,
if you only have a couple of hours to code you can't have everything...