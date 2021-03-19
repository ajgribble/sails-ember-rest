module.exports = {
  friendlyName: 'Populate records',
  description: 'Populate a Waterline query according to the model definition include -> record',
  sync: true,

  inputs: {
    query: {
      type: 'ref',
      description: 'Waterline query object',
      required: true
    },
    associations: {
      type: 'ref',
      description: 'Array of association configurations',
      required: true
    },
    force: {
      type: 'boolean',
      description: 'Ignores the association config and forces all inclusions as records',
      defaultsTo: false
    },
    subCriteria: {
      type: 'ref',
      description: 'A Waterline criteria object to be applied to the populate method',
      defaultsTo: {}
    }
  },

  exits: {
    singularModelSubcriteria: {
      description:
        'Sails does not support sub-criteria (e.g. select / omit) on singular models, this will change in future versions'
    }
  },

  fn: function({ query, associations, force, subCriteria }, exits) {
    associations.forEach(assoc => {
      // if the associations is to be populated with the full records...
      if (assoc.include === 'record' || (assoc.through && assoc.include !== 'link') || force) {
        if (assoc.model && subCriteria[assoc.alias]) {
          query.then(() => {
            /* no-op*/
          });
          throw 'singularModelSubcriteria';
        }

        query.populate(assoc.alias, subCriteria[assoc.alias] || {});
      } else {
        query.populate(assoc.alias, { select: ['id'] });
      }
    });

    query.then(records => {
      const recordsArr = Array.isArray(records) ? records : [records];
      associations.forEach(assoc => {
        // if the associations is to be populated with the full records...
        if (!(assoc.include === 'record' || (assoc.through && assoc.include !== 'link') || force)) {
          recordsArr.forEach(record => {
            if(Array.isArray(record[assoc.alias])) {
              record[assoc.alias] = record[assoc.alias].reduce((prev, data) => {
                return [...prev, data.id];
              }, []);
            }
          });
        }
      });
    });

    return exits.success(query);
  }
};
