import React from 'react';
import {connect, Provider} from 'react-redux';
import {render}  from 'react-dom';
import 'babel-polyfill';
import {combineReducers, createStore, applyMiddleware} from 'redux';
import 'isomorphic-fetch';
import Rx from 'rxjs/Rx';
import createLogger from 'redux-logger';
import {rxReduxMiddleware, observeActionType} from "./rx-redux-middleware";

const INPUT_DELAY_MILLIS = 300;

const MAX_RETRIES = 5;

const UI_REQUEST_GEODATA = 'UI_REQUEST_GEODATA';
const REQUEST_STARTED = 'REQUEST_STARTED';
const REQUEST_COMPLETE = 'REQUEST_COMPLETE';
const REQUEST_ERROR = 'REQUEST_ERROR';

function ui_requestGeodata(address) {
    return {
        type: UI_REQUEST_GEODATA,
        address: address
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

function requestDataReducer(reqData, action) {
    if (reqData === undefined) {
        return {results: [],
                error: null,
                isLoading: false};
    }

    switch (action.type) {
    case REQUEST_STARTED:
        return Object.assign({}, reqData, {isLoading: true});
    case REQUEST_COMPLETE:
        return Object.assign({}, reqData, {results: action.results,
                                           error: null,
                                           isLoading:false});
    case REQUEST_ERROR:
        return Object.assign({}, reqData, {results: [],
                                           error: action.error,
                                           isLoading: false});
    }

    return reqData;
}

const geodataApp = combineReducers({
    geoData: requestDataReducer
});

const appStore = createStore(geodataApp, applyMiddleware(
    createLogger(), rxReduxMiddleware));

function requestWithRetry(url, maxRetries) {
    return  Rx.Observable.defer(
        () => Rx.Observable.fromPromise(
            fetch(url)
                .then(resp => resp.json())
                .then(
                    ({results, error}) => {
                        if (error) {
                            return Promise.reject(error);
                        }

                        return {results: results || []};
                    }
                )
        )
    ).retryWhen(
        errors => errors.flatMap((err, i) => {
            if (i + 1 >= maxRetries) {
                throw err;
            }

            return Rx.Observable.timer((i + 1) * 1000);
        })
    ).catch(error => Rx.Observable.of({error}));
}

observeActionType(UI_REQUEST_GEODATA)
    .pluck('address')
    .do(address => appStore.dispatch(requestStarted(address)))
    .debounceTime(INPUT_DELAY_MILLIS)
    .switchMap(address => {
        if (isBlank(address)) {
            return Rx.Observable.of({results: []});
        }
        
        return requestWithRetry(
            `/geocode?address=${encodeURIComponent(address)}`,
            MAX_RETRIES);
    })
    .subscribe(
        ({results, error}) => {
            if (error === undefined) {
                appStore.dispatch(requestComplete(results));
            } else {
                appStore.dispatch(requestError(error));
            }
        },
        error => appStore.dispatch(requestError(error))
    );

function isBlank(s) {
    if (!s) {
        return true;
    }

    return s.trim().length === 0;
}

class ResultsList extends React.Component {
    render() {
        if (this.props.hideResults) {
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
        this.state = {value: ""};
    }

    render() {
        return (
            <div className="wrapper">
              <input type="text"
                     className={this.props.isLoading ? "loading" : ""}
                     placeholder="enter address"
                     value={this.state.value}
                     onChange={
                         event => {
                             let value = event.target.value;
                             this.setState({value});
                             this.props.onInputChange(value);
                         }
                     }
                     />
              <ResultsList results={this.state.results}
                           hideResults={isBlank(this.state.value) || this.props.isLoading}/>
            </div>
        );
    } 
}

const ReduxGeoInput = connect(
    state => {
        return {
            results: state.geoData.results,
            error: state.geoData.error,
            isLoading: state.geoData.isLoading
        };
    },

    dispatch => {
        return {
            onInputChange: value => {
                dispatch(ui_requestGeodata(value.trim()));
            }
        };
    }
)(GeoInput);
            
render(
    <Provider store={appStore}>
      <ReduxGeoInput/>
    </Provider>,
    document.getElementById('content')
);
