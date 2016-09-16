import React from 'react';
import {render}  from 'react-dom';
import 'babel-polyfill';
import {combineReducers, createStore, applyMiddleware} from 'redux';
import 'isomorphic-fetch';
import Rx from 'rxjs/Rx';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';

const INPUT_DELAY_MILLIS = 300;
const RETRY_DELAY_MILLIS = 1000;

const MAX_RETRIES = 5;

const REQUEST_GEODATA = 'REQUEST_GEODATA';
const REQUEST_STARTED = 'REQUEST_STARTED';
const REQUEST_COMPLETE = 'REQUEST_COMPLETE';
const REQUEST_ERROR = 'REQUEST_ERROR';

class RequestService {
    constructor(urlFn) { 
        if (urlFn === undefined) {
            this.urlFn = params => url;
        } else {
            this.urlFn = urlFn;
        }

        this.subscription = null;
    }

    request(dispatch, ...params) {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }

        dispatch(requestStarted(params[0]));

        this.subscription = Rx.Observable.defer(
            () => Rx.Observable.fromPromise(
                fetch(this.urlFn(...params))
                    .then(resp => resp.json())
                    .then(
                        ({results, error}) => {
                            console.log(`res: ${results}, err: ${error}`);
                            
                            if (error) {
                                return Promise.reject(error);
                            }

                            return results || [];
                        }
                    )
            )
        ).retry(MAX_RETRIES).subscribe(
            results => dispatch(requestComplete(results)),
            err => dispatch(requestError(err))
        );
    }
}                       

let requestService = new RequestService(
    address => `/geocode?address=${encodeURIComponent(address)}`);

function uiRequestGeodata(address) {
    return {
        type: REQUEST_GEODATA,
        address
    };
}

function requestStarted(address) {
    return {
        type: REQUEST_STARTED,
        address
    };
}

function requestError(errorCode) {
    return {
        type: REQUEST_ERROR,
        errorCode
    };
}

function requestComplete(results) {
    return {
        type: REQUEST_COMPLETE,
        results
    };
}

function requestDataReducer(reqData, newData) {
    if (reqData === undefined) {
        return {results: []};
    }

    return Object.assign(reqData, newData);
}

function fetchGeodata(address) {
    return dispatch => {
        requestService.request(dispatch, address);
    };
}

const geodataApp = combineReducers({
    requestDataReducer
});

const appStore = createStore(geodataApp, applyMiddleware(
    thunkMiddleware, createLogger()));

//appStore.dispatch(fetchGeodata('xxx'));

const state = { lastRequest: "",
                lastStatus: "" };

let timeoutId = 0;

function delay(address, delayMillis) {
    clearTimeout(timeoutId);

    return new Promise(function(resolve, reject) {
        timeoutId = setTimeout(function() {
            console.log(address + " " + state.lastRequest);

            return resolve(address);
        }, delayMillis);
    });
}

function makeRequest(address) {
    return new Promise(function(resolve, reject) {
        console.log("requesting " + address);
        
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `/geocode?address=` + encodeURIComponent(address));

        xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {

                let result = JSON.parse(xhr.response);
                
                let error = result.error;
                if (error !== undefined) {
                    console.log(`error is ${error}`);

                    if (error === "timeout") {
                        return resolve(retrieveGeo(address, RETRY_DELAY_MILLIS, true));
                    } else {
                        return reject(error);
                    }
                } else {
                    console.log(`req result is ${result.results}`);

                    return resolve(result.results);


                }
            } else {
                return reject(`error status ${this.status}, ${this.statusText}`);
            }
        };

        xhr.onerror = function() {
            return reject(`error status ${this.status}, ${this.statusText}`);
        };


        xhr.send();
    });
}

function retrieveGeo(address, delayMillis, force) {
    address = address.trim();

    if (!force) {
        if (state.lastRequest === address) {
            console.log("rejecting due to the same address");
            return Promise.reject("address wasn't changed");
        }

        if (address.length === 0) {
            return Promise.reject("address string is blank");
        }
    }

    state.lastRequest = address;

    return delay(address, delayMillis).then(address => makeRequest(address));
}

function isBlank(s) {
    if (!s) {
        return true;
    }

    return s.trim().length === 0; 
}

class ResultsList extends React.Component {
    render() {
        console.log(this.props.emptySearch);
        
        if (this.props.emptySearch) {
            return null;
        }
        
        let results = this.props.results || [];
        if (results.length === 0) {
            return <div className="empty-result">
                Unfortunately nothing was found.
            </div>;
        }

        return (
            <div className="table">
              <div className="row header">
                <div className="cell">Address</div>
                <div className="cell">Latitude</div>
                <div className="cell">Longitude</div>
              </div>
              {
                  results.map(
                      (item) => {
                          return (
                              <div className="row">
                                <div className="cell">{item.address}</div>
                                <div className="cell">{item.lat}</div>
                                <div className="cell">{item.lng}</div>
                              </div>
                          );
                      }
                  )
              }
            </div>
        );
    }
}

class GeoInput extends React.Component {
    constructor() {
        super();
        this.state = { value: '',
                       lastStatus: '',
                       results: [],
                       loading: false };
    }
 
    handleChange(event) {
        console.log(event.target.value);
        this.setState({value: event.target.value,
                  loading: true});
        retrieveGeo(event.target.value, INPUT_DELAY_MILLIS).then(
            result =>  {
                if (!result) {
                    result = [];
                }
                this.setState({lastStatus: `success, addresses found: ${result.length}`,
                               results: result,
                               loading: false});
                console.log(`result length is ${result.length}`);
                
            },
            reason => {
                this.setState({lastStatus: 'error: ' + reason,
                               results: [],
                               loading: false});
                console.log("reason:::" + reason);
            }
        ).catch(reason => {
            this.setState({lastStatus: 'error: ' + reason,
                           results: [],
                           loading: false});
        });
    }

    render() {
        return (
            <div className="wrapper">
              <input type="text"
                     className={state.loading ? "loading" : ""}
                     placeholder="enter address"
                     value={this.state.value}
                     onChange={ event => this.handleChange(event) }
                     />
              <ResultsList results={this.state.results}
                           emptySearch={isBlank(this.state.value)}/>
            </div>
        );
    }   
}
              
render(
    <GeoInput/>,
    document.getElementById('content')
);
