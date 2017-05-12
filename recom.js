// # ReCom
//
// Simple reactive components for small projects
//
// - single immutable state atom
// - `ReCom` super class, that only rerenders if depended on data has changed
// - `get`/`set` - gets, dispatches async set into the state atom
// - uses redux
//
import React from 'react';
import Immutable from 'immutable';
import _ from 'lodash';
import {createStore} from 'redux';
import assert from 'assert';

export const SET_IN = 'SET_IN';

export const dispatchTable = {
  SET_IN: (state, action) => setIn(state, action.path, action.value)
};

export const store = createStore(reduce);

export class ReCom extends React.Component {
  constructor(props) {
    super(props);
    this.dependencies = new Map();
  }

  get(path, defaultValue) {
    let result = getImm(path);

    if (this.accessed instanceof Map) {
      this.accessed.set(path, result);
    }

    if (Immutable.isImmutable(result)) {
      result = result.toJS();
    }

    if (result === undefined) {
      result = defaultValue;
    }

    return result;
  }

  set(path, value) {
    set(path, value);
  }

  componentWillUpdate() {
    this.accessed = new Map();
  }

  componentDidUpdate() {
    this.dependencies = this.accessed;
    this.accessed = undefined;
  }

  shouldComponentUpdate(props, state) {
    if (!_.isEqual(props, this.props)) {
      return true;
    }
    for (let [path, val] of this.dependencies) {
      if (!Immutable.is(val, get(path))) {
        return true;
      }
    }
    return false;
  }

  componentWillMount() {
    this.accessed = new Map();
  }

  componentDidMount() {
    this.dependencies = this.accessed;
    this.accessed = undefined;
    this.unsubscribe = store.subscribe(() => this.setState({}));
  }

  componentWillUnmount() {
    this.unsubscribe();
  }
}

export function set(path, value) {
  store.dispatch({type: SET_IN, path, value});
}

function getImm(path, defaultValue) {
  try {
    return store.getState().getIn(makePath(path), defaultValue);
  } catch (e) {
    return defaultValue;
  }
}

export function get(path, defaultValue) {
  let result = getImm(path, defaultValue);
  if (!Immutable.isImmutable(result)) {
    return result;
  }
  return result.toJS();
}

function reduce(state = new Immutable.Map(), action) {
  console.log(state, dispatchTable, action);
  return (dispatchTable[action.type] || (state => state))(
    state,
    action
  );
}

function makePath(path) {
  if (typeof path === 'string') {
    path = path.split('.');
  }

  assert(Array.isArray(path));
  return path;
}

function setIn(o, path, val) {
  path = makePath(path);

  if (path.length === 0) {
    return Immutable.fromJS(val);
  }

  let key = path[0];
  path = path.slice(1);

  if (typeof key === 'string') {
    if (!(o instanceof Immutable.Map)) {
      o = new Immutable.Map();
    }
  } else if (typeof key === 'number') {
    if (!(o instanceof Immutable.List)) {
      o = new Immutable.List();
    }
  } else {
    assert(false);
  }

  return o.set(key, setIn(o.get(key), path, val));
}
