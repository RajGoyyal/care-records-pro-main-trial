// Generic JSX component loader to replace unreliable <script type="text/babel" src="...">
// Works by fetching the raw JSX file, transpiling with Babel, and evaluating in window scope.

(function(){
  if(!window.Babel){
    console.error('[component-loader] Babel not found. Ensure @babel/standalone is loaded before this script.');
    return;
  }

  const registry = {}; // track load states
  const listeners = {}; // name => callbacks

  function log(...args){ console.log('[component-loader]', ...args); }
  function err(...args){ console.error('[component-loader]', ...args); }

  function notify(name){
    if(listeners[name]){
      listeners[name].forEach(cb=>{ try { cb(window[name]); } catch(e){ err('Listener error for', name, e);} });
      delete listeners[name];
    }
  }

  async function loadJSXComponent(name, path){
    if(window[name]){ log(`Component ${name} already present.`); return Promise.resolve(window[name]); }
    if(registry[name]?.status === 'loading'){
      return new Promise(res=>{ (listeners[name] = listeners[name] || []).push(res); });
    }

    registry[name] = { status: 'loading', started: Date.now() };
    log('Fetching', path, 'for component', name);

    try {
      const response = await fetch(path + '?t=' + Date.now());
      if(!response.ok){ throw new Error(`HTTP ${response.status}`); }
      const source = await response.text();
      log('Fetched bytes:', source.length);

      // Wrap source so errors are easier to attribute
      const wrapped = `try{\n${source}\n;if(!window.${name}){console.warn('After evaluation, window.${name} still undefined');}\n} catch(e){console.error('Eval failure for ${name}:', e); throw e;}`;
      const transformed = Babel.transform(wrapped, { presets: ['react'] });

      try {
        // Evaluate in global scope
        (0, eval)(transformed.code);
      } catch(e){
        err('Evaluation error for', name, e);
        registry[name].status = 'error';
        registry[name].error = e.message;
        notify(name);
        throw e;
      }

      if(window[name]){
        registry[name].status = 'loaded';
        registry[name].ended = Date.now();
        registry[name].duration = registry[name].ended - registry[name].started;
        log(`✅ Loaded ${name} in ${registry[name].duration}ms`);
        notify(name);
        return window[name];
      } else {
        registry[name].status = 'error';
        registry[name].error = 'Component did not attach to window.';
        err(`Component ${name} failed to export (window.${name} missing).`);
        notify(name);
        return null;
      }

    } catch(e){
      err('Load failure for', name, e);
      registry[name].status = 'error';
      registry[name].error = e.message;
      notify(name);
      return null;
    }
  }

  function whenComponent(name, timeout=4000){
    if(window[name]) return Promise.resolve(window[name]);
    return new Promise((resolve, reject)=>{
      const t = setTimeout(()=>{
        reject(new Error(`Timeout waiting for ${name}`));
      }, timeout);
      (listeners[name] = listeners[name] || []).push((cmp)=>{ clearTimeout(t); resolve(cmp); });
    });
  }

  window.HMISLoader = { loadJSXComponent, whenComponent, registry };
})();
