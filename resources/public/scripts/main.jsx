const INPUT_DELAY_MILLIS = 300;
const RETRY_DELAY_MILLIS = 1000;

const state = { lastRequest: "",
                lastStatus: "" };

let timeoutId = 0;

function delay(address, delayMillis) {
    clearTimeout(timeoutId);

    return new Promise(function(resolve, reject) {
        timeoutId = setTimeout(function() {
            console.log(address + " " + state.lastRequest);
            
            if (address === state.lastRequest) {
                return resolve(address);
            } else {
                return reject("address to be requested has been changed");
            }
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

let ResultsList = React.createClass({
    render: function() {
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
              results.map(function(item) {
                  return <div className="row">
                      <div className="cell">{item.address}</div>
                          <div className="cell">{item.lat}</div>
                              <div className="cell">{item.lng}</div>
                      </div>;})
              }
            </div>
        )}
});
              
let GeoInput = React.createClass({
    getInitialState: function() { 
        return { value: '',
                 lastStatus: '',
                 results: [],
                 loading: false }; 
    },
    handleChange: function(event) {
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
    },
    render: function() {
        return (
            <div className="wrapper">
              <input type="text"
                     className={this.state.loading ? "loading" : ""}
                     placeholder="enter address"
                     value={this.state.value}
                     onChange={this.handleChange}
                     />
              <ResultsList results={this.state.results}
                           emptySearch={isBlank(this.state.value)}/>
            </div>
        );
    }
});

ReactDOM.render(
    <GeoInput/>,
    document.getElementById('content')
);
