import 'babel-polyfill';
import Rx from 'rxjs/Rx';

function createPublishingMiddleware() {
    const subject = new Rx.Subject();

    const rxReduxMiddleware = store => next => action => {
        next(action);
        subject.next(action);
    };

    const observeActionType = (...types) => {
        if (types.length === 0) {
            return Rx.Observable.never();
        }

        return subject.filter(({type}) => types.indexOf(type) > -1);
    };

    return {subject, observeActionType, rxReduxMiddleware};
}

export const {observeActionType, rxReduxMiddleware} = 
    createPublishingMiddleware();
