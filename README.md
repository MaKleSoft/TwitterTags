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

## License
Copyright (c) 2012 Martin Kleinschrodt

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.