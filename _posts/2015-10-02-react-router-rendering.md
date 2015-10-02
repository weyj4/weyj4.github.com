---
layout: default
title: Server-Side Rendering with React-Router@1.0.0
---
After not unconsiderable head-scratching, I've managed to solve a problem I had with react-router arising from breaking changes introduced by the transition from 0.13.x > 1.0.0. I'm writing up the solution quickly to spare anyone else the trouble.

The Problem: Server-Side Rendering with React-Router
----------------------------------------------------

The issue is this: with react-router 0.13.x, I could render a React app with express by putting something like this in server.js:

``` javascript
app.get('/*', function (req, res) {  
  Router.run(routes, req.url, Handler => {
    let content = React.renderToString(<Handler />);
    res.render('index', { content: content });
  });
});
```

There would be a corresponding ``` Route ``` in routes.js that called some component as a 'handler'. 

Unfortunately, this doesn't work with react-router 1.0.0 because they've deprecated ``` Router.run ```. The way I've solved the problem is by putting my entire ``` Router ``` into routes.js (which makes sense after all):

``` javascript
...
export default (
  <Router>
    <Route path="/" component={AppHandler} />
    <Route path="/hi" component={HiHandler} />
  </Router>
);
```

Notice that I use the prop 'component' rather than 'handler', as we did in 0.13.x.

In server.js I have to use a RoutingContext component.

``` javascript
app.get('/*', function (req, res) {
  let location = createLocation(req.url);
  match({ routes, location }, (error, redirectLocation, renderProps) => {
    res.send(React.renderToString(<RoutingContext {...renderProps}/>))
  })
});
```

You have to ``` import createLocation from 'history/lib/createLocation' ```. [History](https://github.com/rackt/history) is another rackt package used for tracking url history. You then have to ``` import { match } from "react-router" ```. Oh, and ``` {RoutingContext} ```.

P.S. according to [the docs](https://github.com/rackt/react-router/blob/master/docs/guides/advanced/ServerRendering.md) you should probably be doing some basic error handling here too.
