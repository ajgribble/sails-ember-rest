/**
 * find
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller find action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const pluralize = require('pluralize');
const { map } = require('lodash');
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'find');
  interrupts.find = interrupts.find ? interrupts.find : defaultInterrupt;

  return async function(req, res) {
    // Set the JSON API required header
    res.set('Content-Type', 'application/vnd.api+json');

    // Look up the model
    const Model = actionUtil.parseModel(req);
    // parse criteria from request
    const criteria = actionUtil.parseCriteria(req);
    const limit = actionUtil.parseLimit(req);

    // Look up the association configuration based on the reserved 'include' keyword
    let parsedInclude;
    try {
      parsedInclude = sails.helpers.parseInclude.with({ req, model: Model });
    } catch (err) {
      return sails.helpers.negotiate.with({ res, err });
    }
    const { associations, includedAssociations, includedModels, toInclude } = parsedInclude;

    // Handle the special query parameter 'fields'
    const project = sails.helpers.parseFields.with({ req, model: Model, toInclude });

    // Remove reserved query params as they should not be passed as criteria
    delete criteria.fields;
    delete criteria.include;

    const query = Model.find(project[pluralize(Model.identity)] || {})
      .where(criteria)
      .skip(actionUtil.parseSkip(req))
      .sort(actionUtil.parseSort(req));
      
    if (limit) query.limit(limit);

    try {
      const [count, records] = await Promise.all([
        await Model.count(criteria),
        await sails.helpers.populateRecords
        .with({
          query,
          associations,
          subCriteria: project
        })
      ]);

      interrupts.find.call(
        this,
        req,
        res,
        () => {
          // Only `.watch()` for new instances of the model if
          // `autoWatch` is enabled.
          if (req._sails.hooks.pubsub && req.isSocket) {
            Model.subscribe(req, map(records, Model.primaryKey));
            if (req.options.autoWatch) {
              Model._watch(req);
            }
            // Also subscribe to instances of all associated, included models
            req.options.associations = _.flatten(associations);
            records.forEach(record => {
              actionUtil.subscribeDeep(req, record);
            });
          }
          const specJSON = sails.helpers.buildJsonApiResponse.with({
            model: Model,
            records: records,
            meta: Object.assign({ total: count })
          });
          res.ok(specJSON, actionUtil.parseLocals(req));
        },
        Model,
        records
      );
    } catch(err) {
      return sails.helpers.negotiate.with({ res, err });
    }
  };
};
