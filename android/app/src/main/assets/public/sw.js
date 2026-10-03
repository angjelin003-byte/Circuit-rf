/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "bced6f606fec4ff0dc85e2d1f4efb310"
  }, {
    "url": "pwa-512x512.png",
    "revision": "bced6f606fec4ff0dc85e2d1f4efb310"
  }, {
    "url": "pwa-192x192.png",
    "revision": "5530ce9a7359f0f4cd127dee709c312a"
  }, {
    "url": "index.html",
    "revision": "e9a80ac2925f752e3a53f5226a1684b5"
  }, {
    "url": "icon.svg",
    "revision": "e23cc3177927922926d4b4a1cff4c6e6"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e3e1ae5cfb5a382e8335456aa2917217"
  }, {
    "url": "assets/index-Dl2Xr3lr.css",
    "revision": null
  }, {
    "url": "assets/index-DIfMVPm9.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "e3e1ae5cfb5a382e8335456aa2917217"
  }, {
    "url": "icon.svg",
    "revision": "e23cc3177927922926d4b4a1cff4c6e6"
  }, {
    "url": "pwa-192x192.png",
    "revision": "5530ce9a7359f0f4cd127dee709c312a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "bced6f606fec4ff0dc85e2d1f4efb310"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "bced6f606fec4ff0dc85e2d1f4efb310"
  }, {
    "url": "manifest.webmanifest",
    "revision": "c9ed3b11b0a40ac441cd44b8afc8b8fd"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
