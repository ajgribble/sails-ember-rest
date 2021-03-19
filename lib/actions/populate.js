/**
 * populate
 *
 * returns a function with access to an interruption context
 *
 * @description :: Server-side logic for a generic crud controller populate action that can be used to represent all models
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
const pluralize = require('pluralize');
const actionUtil = require('./../util/actionUtil');
const shimFunction = require('./../util/shimFunction');
const defaultInterrupt = require('./../interrupts/defaultInterrupt');
const { parallel, waterfall } = require('async');
const { find } = require('lodash');

module.exports = function(interrupts = {}) {
  interrupts = shimFunction(interrupts, 'populate');
  interrupts.populate = interrupts.populate ? interrupts.populate : defaultInterrupt;

  return async function(req, res) {
    const Model = actionUtil.parseModel(req);
    const relation = req.options.alias;
    if (!relation || !Model) {
      return res.serverError(new Error('No model or relationship identified!'));
    }
    const association = find(req.options.associations, {
      alias: relation
    });
    const isSingularAssociation = association.type === 'model';
    const relationIdentity = isSingularAssociation ? association.model : association.collection;
    const RelatedModel = req._sails.models[relationIdentity];
    // Allow customizable blacklist for params.
    req.options.criteria = req.options.criteria || {};
    req.options.criteria.blacklist = req.options.criteria.blacklist || [
      'fields',
      'include',
      'limit',
      'skip',
      'sort',
      'id',
      'parentid'
    ];
    // Determine whether to populate using a criteria, or the
    // specified primary key of the child record, or with no
    // filter at all.
    if (!RelatedModel) {
      return res.serverError(
        new Error(`Invalid route option, "model".\nI don't know about any models named: ${relationIdentity}`)
      );
    }
    const parentPk = actionUtil.formatPk(Model, req.param('parentid'));
    const childPk = actionUtil.parsePk(req, RelatedModel);
    const where = childPk ? {} : actionUtil.parseCriteria(req);
    const skip = actionUtil.parseSkip(req);
    const limit = actionUtil.parseLimit(req);
    const sort = actionUtil.parseSort(req);
    const populateOptions = {
      where: where
    };
    if (childPk) {
      where[RelatedModel.primaryKey] = [childPk];
    }
    if (skip) {
      populateOptions.skip = skip;
    }
    if (limit) {
      populateOptions.limit = limit;
    }
    if (sort) {
      populateOptions.sort = sort;
    }

    // Look up the association configuration based on the reserved 'include' keyword
    let parsedInclude;
    try {
      parsedInclude = sails.helpers.parseInclude.with({ req, model: RelatedModel });
      const { associations, includedAssociations, includedModels, toInclude } = parsedInclude;

      // Handle the special query parameter 'fields'
      const project = sails.helpers.parseFields.with({ req, model: RelatedModel, toInclude });

      const query = isSingularAssociation
        ? Model.findOne(parentPk).populate(relation)
        : Model.findOne(parentPk).populate(relation, populateOptions);

      const [count, matchingRecord] = await Promise.all([
        await sails.helpers.countRelationship.with({ model: Model, association, pk: parentPk }),
        await query
      ]);

      if (!matchingRecord) {
        throw new Error('No record found with the specified id.');
      }

      if (!matchingRecord[relation]) {
        throw new Error(`Specified record (${parentPk}) is missing relation ${relation}`);
      }

      const children = isSingularAssociation ? [matchingRecord[relation]] : matchingRecord[relation];
      // Sort needs to be reapplied but skip and limit do not
      const populateQuery = RelatedModel.find(project[pluralize(RelatedModel.identity)] || {})
        .where({ [RelatedModel.primaryKey]: children.map(child => child[RelatedModel.primaryKey]) })
        .sort(sort);

      const results = await sails.helpers.populateRecords
        .with({
          query: populateQuery,
          associations,
          subCriteria: project
        });

      interrupts.populate.call(
        this,
        req,
        res,
        () => {
          // Subscribe to instance, if relevant
          // TODO: only subscribe to populated attribute- not the entire model
          if (sails.hooks.pubsub && req.isSocket) {
            Model.subscribe(req, [parent[Model.primaryKey]]);
            actionUtil.subscribeDeep(req, parent);
          }

          const json = sails.helpers.buildJsonApiResponse.with({
            model: RelatedModel,
            records: sails.helpers.linkAssociations(RelatedModel, results),
            meta: Object.assign({}, { total: count })
          });

          if(isSingularAssociation) {
            json.data = json.data[0];
          }

          //BOOM! counted relationships!
          res.ok(
            json,
            actionUtil.parseLocals(req)
          );
        },
        Model,
        results
      );
    } catch (err) {
      console.log(err);
      return sails.helpers.negotiate.with({ res, err });
    }
  };
};
