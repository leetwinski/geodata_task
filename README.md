# geoclient

Simple geodata api in clojure/es6.

Geodata is requested from a (potentially) slow and error prone remote server, 
while the response to the client should be sent in 1s maximum. 
All the successfull results are cached inside in-memory database.

## Prerequisites

You will need [Leiningen][] 2.0.0 or above installed.

[leiningen]: https://github.com/technomancy/leiningen

## Running

To compile the client code you should run the following commands from the project root:

    cd ./src_client; npm install; ./node_modules/.bin/gulp build

To start a web server for the application, run:

    lein ring server

## License

Copyright © 2016 FIXME
