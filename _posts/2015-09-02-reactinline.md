---
layout: default
title: React Inline Styles?
---
React Inline Styles?
--------------------
We use React a ton where I work, to the extent that I think this summer I've probably written more JSX than plain HTML. Thinking of your application in terms of modular components is enormously powerful. One trend that's finding its way into design discussions at work recently is that of inline, modular CSS to complement component-oriented JS and HTML. 

> Q. But I thought inline styles were bad! That's literally the first thing I learned after &lt;h1&gt;Hello World&lt;h1&gt;.

A. Me too, young grasshopper. If React wants something, they'll probably get it, but we can at least review both sides of the issue and try to understand what our erstwhile benefactors at Facebook are up to.

The discourse around inline CSS traces back to a [talk](https://speakerdeck.com/vjeux/react-css-in-js) given last fall by Christopher Chedeau (vjeux on the web), an engineer at, you guessed it, Facebook. It seems his team had been resorting to increasingly hacky solutions to problems that have always existed with CSS, namely: tons of global variables (Boostrap uses like 600); scary production CSS files where everyone's afraid if they delete an odd line something will break; and increasing adoption of preprocessors like Less and Sass<sup id="a1">[1](#f1)</sup>.

Vjeux's first concern, about global variables, is certainly legitimate, though it sounds like his team's use case was a little more involved than what I've come across in my work as a full-stack dev. The third 'concern', about Less and Sass, sounds more like a justification to me. But having shared Less files with multiple developers throughout the development of a product, I can definitely relate to the sense of unease at cleaning up CSS.

OK, so what does it look like to use inline styles with React components?

``` javascript

var reactStyle = {
  background: '#CCFFFF',
  fontSize: '24',
  border: '4px solid black'
};


var Demo = React.createClass({

  render: function() {
    return (
      <div style={reactStyle}>Look, Inline Styles!</div>
    );
  }
});

React.render(
  <Demo />,
  document.getElementById('example')
);

```

If you ask me, surprisingly clean. Basically all we did is create something that looks like a JS object, where the keys were just camelcased CSS properties, and the values were comma-separated, single-quoted CSS values.

To me this approach seems to go hand-in-hand with a wider shift toward thinking about web apps in terms of components, a shift that's really been brought about by React. There are certainly wrinkles to iron out; for instance, one of our clients requires that we create print stylesheet for a lot of out screens, and there doesn't seem to be a way to do that here. But as I can only predict that React will grow in popularity going forward, I suspect that the changes in how its users think about web development will pave the way for further development of this approach.

If you read all the way to the bottom, here's your prize-React put out the [first stable release](http://facebook.github.io/react/blog/2015/09/02/new-react-developer-tools.html) of its dev tools, which I'd been using in beta for the past month, today.

<b id="f2">2</b><small> _Interestingly, it sounds like Boostrap 4 is going to use SCSS, which is a lot more CSS-y than either Sass or Less_ </small> [↩](#a2)
