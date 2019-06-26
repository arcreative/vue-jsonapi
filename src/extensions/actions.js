import omit from 'lodash-es/omit'

import RequestError from '../support/request-error'

export default (apiClient) => {
  return {
    find({ commit }, { channel, type, id, params, suppress = false }) {
      params = omit(params, (param) => {
        return param === null || param === undefined;
      });
      commit('updateLoading', { channel, value: true });
      commit('updateError', { channel, value: null });
      commit('updateNoRecords', { channel, value: false });
      apiClient
        .find(type, id, params)
        .then(records => {
          commit('updateChannel', { channel, records });
          commit('updateNoRecords', { channel, value: records.length === 0 });
        })
        .catch(error => {
          let requestError = new RequestError(error, { suppress });
          commit('updateError', { channel, value: requestError });
          this._vm.$emit('didFindError', requestError);
        })
        .finally(() => {
          commit('updateLoading', { channel, value: false });
        })
    },
    save({ commit }, { record, params = {}, suppress = false, suppressSuccess = false, suppressError = false }) {
      let persisted = record._persisted;
      apiClient
        .save(record, params)
        .then(record => {
          // Notify of save/create/update
          this._vm.$emit('didSaveRecord', { record, suppress: suppress || suppressSuccess });
          this._vm.$emit(persisted ? 'didUpdateRecord' : 'didCreateRecord', { record, suppress: suppress || suppressSuccess });

          // Notify that one or more records of this type changed
          let type = record.type.split('_').map(part => {
            return part[0].toUpperCase() + part.slice(1, part.length);
          }).join('');
          this._vm.$emit('didUpdate' + type, { record });
        }, error => {
          this._vm.$emit('didSaveError', new RequestError(error, { record, suppress: suppress || suppressError }));
        });
    }
  };
}
