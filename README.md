# stream-buffer-cache
Cache for node.js streams. Stores stream results in a memory allowing to immediatly replay the stream.

Speed up your services.

Can be applied to any cache that implements `Map` interface e.g. regular `Map` or LRU-cache. It redefines `get` and `set` methods to make a `Map` works with streams.

Usefull for caching slow repetitive streaming connections, such as S3 requests or complex database queries.


Installation
------------

```npm i @hqjs/stream-buffer-cache```


Example
-------------

```js
// You can pass any class that implements Map interface
const LRUMap = require('lru-cache');
const Cache = require('@hqjs/stream-buffer-cache')(LRUMap);

// LRU cache options
const options = {
  max: 500,
  maxAge: 1000 * 60 * 60,
};

// Pass your Map class option to Cache constructor
const cache = new Cache(options);
const fs = require('fs');

fs.createReadStream('./buffer-cache.js', { encoding: 'utf8' })
  .pipe(cache.set('test'));

cache.get('test')
  .pipe(fs.createWriteStream('./buffer-cache.js.test'));
```


API
---

This methods from parent `Map` class are overriden

##### set(key)
returns a Duplex stream
```js
fileStream.pipe(cache.set('key')).pipe(res);
```


##### get(key) => ReadableStream

```js
const cached = cache.get('key');
if (cached) {
	cached.pipe(res);
}
```
