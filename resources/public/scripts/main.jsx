const INPUT_DELAY_MILLIS = 300;
const RETRY_DELAY_MILLIS = 1000;

let lastRequest;

function delayAndRequestAddress(address, delay) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            console.log(address + " " + lastRequest);
            
            if (address === lastRequest) {
                resolve(address);
            } else {
                reject("address to be requested has been changed");
            }
        }, delay);
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
                    console.log("error is " + error);

                    if (error === "timeout") {
                        return delayAndRequestAddress(address, RETRY_DELAY_MILLIS);
                    } else {
                        return reject(error);
                    }
                } else {
                    console.log("result is " + result.results);
                    return resolve(result.results);
                }
            } else {
                return reject(`error status {this.status}, {this.statusText}`);
            }
        };

        xhr.onerror = function() {
            return reject(`error status {this.status}, {this.statusText}`);
        };


        xhr.send();
    });
}

function retrieveGeo(address, delay) {
    lastRequest = address.trim();

    if (lastRequest.length === 0) {
        return Promise.reject("address string is blank");
    }

    return delayAndRequestAddress(lastRequest, delay).then(
        function(address) {
            return makeRequest(address);
        }, 
        function(reason) {
            return Promise.reject(reason);
        }
    );
}

let ResultsList = React.createClass({
    render: function() {
        let results = this.props.results || [];
        return (<ul>
                {results.map(function(item) {
                    return <li>{ item.address + ": " + item.lat + "/" + item.lng }</li>;
                })}
                </ul>);
    }
});

let GeoInput = React.createClass({
    getInitialState: function() { return { value: 'enter address',
                                           lastStatus: '',
                                           results: []}; },
    handleChange: function(event) {
        console.log(event.target.value);
        this.setState({value: event.target.value, results: []});
        retrieveGeo(event.target.value, INPUT_DELAY_MILLIS).then(
            function(result) {
                if (!result) {
                    result = [];
                }
                this.setState({lastStatus: 'success, addresses found: ' + result.length,
                               results: result});
                console.log("result is " + result);
                
            }.bind(this),
            function(reason) {
                this.setState({lastStatus: 'error: ' + reason});
                console.log("reason:::" + reason);
            }.bind(this)
        );
    },
    render: function() {
        return (
            <div>
              <input type="text"
                     value={this.state.value}
                     onChange={this.handleChange}
                     />
              <br/>
              <div>last status: {this.state.lastStatus}</div>
              <ResultsList results={this.state.results}/>
            </div>
        );
    }
});

ReactDOM.render(
    <GeoInput/>,
    document.getElementById('content')
);
