/**
 * sails-json-api hook
 *
 * @description :: A hook definition.  Extends Sails by adding shadow routes, implicit actions, and/or initialization logic.
 * @docs        :: https://sailsjs.com/docs/concepts/extending-sails/hooks
 */

module.exports = function defineSailsJsonApiHook(sails) {

  return {

    /**
     * Runs when a Sails app loads/lifts.
     *
     * @param {Function} done
     */
    initialize(done) {

      sails.log.info('Initializing custom hook (`sails-json-api`)');

      return done();
    },
    configure() {
      sails.log.warn('configure')
      sails.config.helpers.moduleDefinitions = Object.assign({}, sails.config.helpers.moduleDefinitions, {
        buildJsonApiResponse: require('./templates/helpers/build-json-api-response'),
        countRelationship: require('./templates/helpers/count-relationship'),
        generateResourceLink: require('./templates/helpers/generate-resource-link'),
        getAssociationConfig: require('./templates/helpers/get-association-config'),
        linkAssociations: require('./templates/helpers/link-associations')
      });

      // The policy map MUST be all lowercase as Sails' policy hook will make this assumption
      sails.config.policies.moduleDefinitions = Object.assign({}, sails.config.policies.moduleDefinitions, {
        jsonapicreate: require('./templates/policies/jsonApiCreate'),
        jsonapidestroy: require('./templates/policies/jsonApiDestroy'),
        jsonapifind: require('./templates/policies/jsonApiFind'),
        jsonapifindOne: require('./templates/policies/jsonApiFindOne'),
        jsonapihydrate: require('./templates/policies/jsonApiHydrate'),
        jsonapipopulate: require('./templates/policies/jsonApiPopulate'),
        jsonapisetheader: require('./templates/policies/jsonApiSetHeader'),
        jsonapiupdate: require('./templates/policies/jsonApiUpdate'),
        jsonapivalidateheaders: require('./templates/policies/jsonApiValidateHeaders')
      });
    }
  };
};

module.exports.actions = {
  create: require('./templates/actions/create'),
  destroy: require('./templates/actions/destroy'),
  find: require('./templates/actions/find'),
  findone: require('./templates/actions/findone'),
  hydrate: require('./templates/actions/hydrate'),
  populate: require('./templates/actions/populate'),
  update: require('./templates/actions/update')
};
module.exports.controllers = {
  JsonApiController: require('./templates/controllers/JsonApiController')
},
module.exports.hooks = {
  registerSerializers: require('./templates/hooks/register-serializers')
};
module.exports.policies = {
};
module.exports.responses = {
  created: require('./templates/responses/created'),
  noContent: require('./templates/responses/noContent'),
  notAcceptable: require('./templates/responses/notAcceptable'),
  unsupportedMediaType: require('./templates/responses/unsupportedMediaType')
};
module.exports.util = require('./templates/util/actionUtil');