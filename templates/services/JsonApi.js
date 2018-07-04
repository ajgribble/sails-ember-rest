/**
 * JsonApi service
 *
 * @module JsonApi
 */
const { camelCase, kebabCase, omit, pick, reduce, uniqBy } = require('lodash');
const pluralize = require('pluralize');
const actionUtil = require('./../util/actionUtil');

module.exports = {
  /**
   * Prepare an individual resource's associations
   *
   */
  prepareResourceAssociations(record, associations, primaryKey, json, toJSON, associatedRecords, include) {
    let included = [];
    let links = {};

    // get rid of the record's prototype ( otherwise the .toJSON called in res.send would re-insert embedded records)
    record = Object.assign({}, toJSON.call(record));
    associations.forEach(association => {
      const { alias, collection, model, through, type, via } = association;
      let assocModelIdentifier = pluralize(camelCase(sails.models[collection || model].globalId));
      let assocModel;
      let assocType;
      let assocPK;

      if (type === 'collection') {
        assocModel = sails.models[collection];
        assocPK = assocModel.primaryKey;
        assocType = pluralize(assocModel.globalId.toLowerCase());

        // Handle populated relationships
        if (
          (association.include === 'index' || association.include === 'record') &&
          record[alias] &&
          record[alias].length > 0
        ) {
          /* XXX
                    json.data.relationships[assocModelIdentifier] = uniqBy(
                        json.data.relationships[assocModelIdentifier].concat(JsonApi.linkAssociations(assocModel, record[association.alias])),
                        assocPK
                    );
                    // reduce association on primary record to an array of IDs
                    
                    record[association.alias] = reduce(
                        record[association.alias],
                        (filtered, rec) => {
                            filtered.push(rec[assocPK]);
                            return filtered;
                        },
                        []
                    );
                    */
        }

        //through relations not in link mode are now covered by populate instead of index associations,
        //so they are processed in the if statement above ^
        if (!through && association.include === 'index' && associatedRecords[alias]) {
          record[alias] = reduce(
            associatedRecords[alias],
            (filtered, rec) => {
              if (rec[via] === record[primaryKey]) {
                filtered.push(rec[assocPK]);
              }
              return filtered;
            },
            []
          );
        }

        //@todo if association.include startsWith index: ... fill contents from selected column of join table
        if (association.include === 'link') {
          links[alias] = linkPrefix + '/' + modelPlural.toLowerCase() + '/' + record[model.primaryKey] + '/' + alias; //"/" + sails.config.blueprints.prefix
          delete record[alias];
        }
        //record[association.alias] = map(record[association.alias], 'id');

        // Side-load any requested relationships
        const assocAssociations = actionUtil.getAssociationConfiguration(assocModel, 'detail');
        const serializedResources = record[alias].map(r => {
          return JSONAPISerializer.serialize(kebabCase(assocType), r, assocAssociations)
        });
        const linkedRecords = JsonApi.linkAssociations(assocModel, serializedResources);
        if (include && alias === include) {
          included = uniqBy(included.concat(linkedRecords), assocPK);
        }
      }

      if (association.include === 'record' && type === 'model' && record[alias]) {
        assocModel = sails.models[model];
        assocPK = assocModel.primaryKey;
        assocType = pluralize(assocModel.globalId.toLowerCase());

        // Side-load any requested relationships
        const serializedResource = JSONAPISerializer.serialize(kebabCase(record[assocType]), alias);
        const linkedRecords = JsonApi.linkAssociations(assocModel, serializedResource);
        if (include && alias === include) {
          included = uniqBy(included.concat(linkedRecords), assocPK);
        }

        /*
                // while it's possible, we should not really do this, it is more efficient to return a single model in a 1 to 1 relationship
                if (association.include === "link")
                {
                    links[ association.alias ] = sails.config.blueprints.prefix + "/" + modelPlural.toLowerCase() + "/" + record.id + "/" + association.alias;
                    delete record[ association.alias ];
                }
                */
      }
    });
    // Cleanup the relationships
    if (json.data.relationships && json.data.relationships.length > 0) {
      json.data.relationships = json.data.relationships.map(relationship => pick(relationship, ['id', 'type']));
    }

    if (included.length > 0) {
      json.included = included;
    }
  },

  /**
   * Build a 'Not Found' response body to be consumed by JsonApi's DS.JSONAPIAdapter
   *
   * @param {Collection} model Waterline collection object (returned from parseModel)
   * @return {Object} The returned structure can be consumed by DS.JSONAPIAdapter when passed to res.json()
   */
  buildNotFoundResponse(model) {
    const title = 'Not Found';
    const detail = `No record found with the specified ${model.primaryKey}`;

    return {
      errors: [{ status: '404', title, detail }]
    };
  }
};
