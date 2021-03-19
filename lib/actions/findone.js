/**
 * findone
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller findone action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const { pick } = require('lodash');
const pluralize = require('pluralize');
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const { parallel, waterfall } = require('async');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'findone');
  interrupts.findone = interrupts.findone ? interrupts.findone : defaultInterrupt;

  return async function(req, res) {
    // Set the JSON API required header
    res.set('Content-Type', 'application/vnd.api+json');

    const Model = actionUtil.parseModel(req);
    const pk = actionUtil.requirePk(req);
    const query = Model.findOne(pk);

    // Look up the association configuration based on the reserved 'include' keyword
    let parsedInclude;
    try {
      parsedInclude = sails.helpers.parseInclude.with({ req, model: Model });
    } catch (err) {
      return sails.helpers.negotiate.with({ res, err });
    }
    const { associations, toInclude } = parsedInclude;

    // Handle the special query parameter 'fields'
    const project = sails.helpers.parseFields.with({ req, model: Model, toInclude });

    // Remove reserved query params as they should not be passed as criteria
    delete req.query.fields;
    delete req.query.include;

    const matchingRecord = await sails.helpers.populateRecords
      .with({
        query,
        associations,
        subCriteria: project
      })
      .where(actionUtil.parseCriteria(req));

      if (!matchingRecord) {
        return res.notFound('No record found with the specified ' + Model.primaryKey + '.');
      }
      interrupts.findone.call(
        this,
        req,
        res,
        () => {
          if (sails.hooks.pubsub && req.isSocket) {
            Model.subscribe(req, [matchingRecord[Model.primaryKey]]);
            // Also subscribe to instances of all associated, included models
            req.options.associations = _.flatten(associations);
            actionUtil.subscribeDeep(req, matchingRecord);
          }

          res.ok(
            sails.helpers.buildJsonApiResponse.with({ model: Model, records: matchingRecord }),
            actionUtil.parseLocals(req)
          );
        },
        Model,
        matchingRecord
      );
  };
};
