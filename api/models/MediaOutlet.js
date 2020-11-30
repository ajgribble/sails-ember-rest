export default {
  attributes: {
    name: {
      type: 'string',
      required: true,
      minLength: 1
    },
    type: {
      type: 'string'
    },
    publishers: {
      collection: 'Publisher',
      via: 'outlet'
    }
  }
};
