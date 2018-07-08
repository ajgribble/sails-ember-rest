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
      sails.config.helpers.moduleDefinitions = Object.assign({}, {
        buildJsonApiResponse: require('./templates/helpers/build-json-api-response'),
        countRelationship: require('./templates/helpers/count-relationship'),
        generateResourceLink: require('./templates/helpers/generate-resource-link'),
        getAssociationConfig: require('./templates/helpers/get-association-config'),
        linkAssociations: require('./templates/helpers/link-associations')
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
  jsonApiCreate: require('./templates/policies/jsonApiCreate'),
  jsonApiDestroy: require('./templates/policies/jsonApiDestroy'),
  jsonApiFind: require('./templates/policies/jsonApiFind'),
  jsonApiFindOne: require('./templates/policies/jsonApiFindOne'),
  jsonApiHydrate: require('./templates/policies/jsonApiHydrate'),
  jsonApiPopulate: require('./templates/policies/jsonApiPopulate'),
  jsonApiSetHeader: require('./templates/policies/jsonApiSetHeader'),
  jsonApiUpdate: require('./templates/policies/jsonApiUpdate'),
  jsonApiValidateHeaders: require('./templates/policies/jsonApiValidateHeaders')
};
module.exports.responses = {
  created: require('./templates/responses/created'),
  noContent: require('./templates/responses/noContent'),
  notAcceptable: require('./templates/responses/notAcceptable'),
  unsupportedMediaType: require('./templates/responses/unsupportedMediaType')
};
module.exports.util = require('./templates/util/actionUtil');