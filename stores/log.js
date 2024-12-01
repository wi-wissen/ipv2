// Vue can't workaround Promise errors without a log storage
export const useLogStore = defineStore('log', {
    state: () => ({
      logs: []
    }),
    
    actions: {
      _log(type, layer, protocol, msg, data = null) {
        this.logs.push({
          timestamp: new Date(),
          type,
          layer,
          protocol,
          msg,
          data
        });
        
        const config = useRuntimeConfig();
        if(type !== 'debug' || config.public.debug) {
          console[type](`[${layer}][${protocol}] ${msg}`, data);
        }
      },
      
      log(layer, protocol, msg, data = {}) {
        this._log('log', layer, protocol, msg, data);
      },
      
      error(layer, protocol, msg, data = {}) {
        this._log('error', layer, protocol, msg, data);
      },
      
      success(layer, protocol, msg, data = {}) {
        this._log('success', layer, protocol, msg, data);
      },
      
      debug(layer, protocol, msg, data = {}) {
        this._log('debug', layer, protocol, msg, data);
      },
      
      clearLogs() {
        this.logs = [];
      }
    }
  });