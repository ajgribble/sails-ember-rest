import supertest from 'supertest';

describe('Integration | Action | populate', function() {
  describe(':: response format', function() {
    it('should respond with status code 200', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(200)
        .end(done);
    });
    it('should respond with status code 400', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/notarealrelationship')
        .expect(400)
        .expect(res => {
          const { errors } = res.body;

          expect(errors).to.be.an.instanceof(Array);
          expect(errors).to.have.length(1);
          expect(errors[0].title).to.equal('Bad Request');
          expect(errors[0].detail).to.exist;
        })
        .end(done);
    });
    it('should return an object as root response value', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a data array containing a collection of resource objects', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.data).to.be.an.instanceof(Array);
        })
        .end(done);
    });
    it('should return a meta object', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.meta).to.be.an.instanceof(Object);
        })
        .end(done);
    });
    it('should return a meta total that is a number', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          expect(res.body.meta)
            .to.have.property('total')
            .that.is.a('number');
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return 3 comments with proper metadata at all levels', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments')
        .expect(res => {
          const { data, meta } = res.body;
          const focusDoc = data[0];

          expect(data).to.have.lengthOf(3);
          expect(meta.total).to.equal(3);

          expect(focusDoc.id).to.equal('1');
          expect(focusDoc.type).to.equal('comment');
          expect(focusDoc.attributes.text).to.include('Nice');
          expect(focusDoc.attributes['created-at']).to.exist;
          expect(focusDoc.attributes.createdAt).to.not.exist;

          expect(focusDoc.relationships).to.exist;
          expect(Object.keys(focusDoc.relationships).length).to.equal(2);
          expect(focusDoc.relationships.author.links.related.href).to.equal(
            `http://localhost:1337/comments/${focusDoc.id}/author`
          );
          expect(focusDoc.relationships.author.links.related.meta.count).to.equal(1);
        })
        .end(done);
    });
    it('should return 1 author with proper metadata at all levels', function(done) {
      supertest(sails.hooks.http.app)
        .get('/comments/2/author')
        .expect(res => {
          const { data, meta } = res.body;

          expect(meta.total).to.equal(1);

          expect(data.id).to.equal('3');
          expect(data.type).to.equal('author');
          expect(data.attributes['created-at']).to.exist;
          expect(data.attributes.createdAt).to.not.exist;

          expect(data.relationships).to.exist;
          expect(Object.keys(data.relationships).length).to.equal(3);
          expect(data.relationships.comments.links.related.href).to.equal(
            `http://localhost:1337/authors/${data.id}/comments`
          );
          expect(data.relationships.comments.links.related.meta.count).to.equal(2);
        })
        .end(done);
    });
    it('should return 2 authors with associated, 3 non-duplicated publishers', function(done) {
      supertest(sails.hooks.http.app)
        .get('/publishers/1/authors?include=publishers')
        .expect(res => {
          const { data, included, meta } = res.body;
          const focusDoc = data[1];

          expect(data).to.have.lengthOf(2);
          expect(meta.total).to.equal(2);

          expect(focusDoc.id).to.equal('3');
          expect(focusDoc.type).to.equal('author');
          expect(focusDoc.attributes.name).to.equal('Cob');
          expect(focusDoc.attributes['created-at']).to.exist;
          expect(focusDoc.attributes.createdAt).to.not.exist;

          expect(focusDoc.relationships).to.exist;
          expect(Object.keys(focusDoc.relationships).length).to.equal(3);
          expect(focusDoc.relationships.publishers.links.related.href).to.equal(
            `http://localhost:1337/authors/${focusDoc.id}/publishers`
          );
          expect(focusDoc.relationships.publishers.links.related.meta.count).to.equal(2);
          expect(data[0].relationships.publishers.links.related.meta.count).to.equal(1);

          expect(included).to.have.lengthOf(2);
          included.forEach(record => {
            expect(record.type).to.equal('publisher');
          });
        })
        .end(done);
    });
  });

  describe(':: query functions', function() {
    it('should honor additional query params', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=Terrible')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.data[0].attributes.text).to.include('Terrible');
        })
        .end(done);
    });
    it('should still return the total number of relations NO MATTER WHAT', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=Terrible')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support limit parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?limit=1')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support skip parameter', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?skip=2')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(1);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('should support simple sort parameter (ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=text%20ASC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('A great try.');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support simple sort parameter (DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=text%20DESC')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Terrible article...');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('A great try.');
        })
        .end(done);
    });
    it('should support array sort parameter (single ASC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"text":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('A great try.');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support array sort parameter (single DESC)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"text":"DESC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Terrible article...');
          expect(res.body.data[1].attributes.text).to.equal('Nice article!');
          expect(res.body.data[2].attributes.text).to.equal('A great try.');
        })
        .end(done);
    });
    it('should support array sort parameter (multi-column)', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?sort=[{"author":"ASC"},{"text":"ASC"}]')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(3);
          expect(res.body.meta.total).to.equal(3);
          expect(res.body.data[0].attributes.text).to.equal('Nice article!');
          expect(res.body.data[1].attributes.text).to.equal('A great try.');
          expect(res.body.data[2].attributes.text).to.equal('Terrible article...');
        })
        .end(done);
    });
    it('should support empty query results', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?text[contains]=EMPTY YO')
        .expect(res => {
          expect(res.body.data).to.have.lengthOf(0);
          expect(res.body.meta.total).to.equal(3);
        })
        .end(done);
    });
    it('support the include query param', function(done) {
      supertest(sails.hooks.http.app)
        .get('/articles/1/comments?include=author')
        .expect(res => {
          const { included } = res.body;

          expect(included).to.have.length(2);

          included.forEach(record => {
            expect(record.type).to.equal('author');
            expect(record.relationships.articles.links.related.href).to.equal(
              `http://localhost:1337/authors/${record.id}/articles`
            );
            expect(record.relationships.comments.links.related.href).to.equal(
              `http://localhost:1337/authors/${record.id}/comments`
            );

            if (record.id === '1') {
              expect(record.relationships.articles.links.related.meta.count).to.equal(1);
              expect(record.relationships.comments.links.related.meta.count).to.equal(0);
            }

            if (record.id === '2') {
              expect(record.relationships.articles.links.related.meta.count).to.equal(1);
              expect(record.relationships.comments.links.related.meta.count).to.equal(1);
            }
          });
        })
        .end(done);
    });
  });
  it('should support the fields query param to display only the fields of the populated records (singular relationship)', function(done) {
    supertest(sails.hooks.http.app)
      .get('/articles/1/author?fields[authors]=name')
      .expect(200)
      .expect(res => {
        const { data } = res.body;

        expect(data.attributes.name).to.exist;
        expect(data.attributes.age).to.not.exist;
      })
      .end(done);
  });
  it('should support the fields query param to display only the fields of the populated records (plural relationship)', function(done) {
    supertest(sails.hooks.http.app)
      .get('/authors/1/articles?fields[articles]=')
      .expect(200)
      .expect(res => {
        const { data } = res.body;

        data.forEach(record => {
          expect(record.attributes.name).to.not.exist;
        });
      })
      .end(done);
  });
  it('should support the fields query param in conjunction with the include query param (singluar relationship)', function(done) {
    supertest(sails.hooks.http.app)
      .get('/articles/1/author?include=articles&fields[authors]=name&fields[articles]=')
      .expect(200)
      .expect(res => {
        const { data, included } = res.body;

        expect(data.attributes.name).to.exist;
        expect(data.attributes.age).to.not.exist;

        included.forEach(record => {
          expect(record.type).to.equal('article');
          expect(record.attributes).to.not.exist;
        });
      })
      .end(done);
  });
  it('should support the fields query param in conjunction with the include query param (plural relationship)', function(done) {
    supertest(sails.hooks.http.app)
      .get('/authors/1/articles?include=comments&fields[comments]=&fields[articles]=')
      .expect(200)
      .expect(res => {
        const { data, included } = res.body;

        data.forEach(record => {
          expect(record.type).to.equal('article');
          expect(record.attributes.title).to.not.exist;
        });
        included.forEach(record => {
          expect(record.type).to.equal('comment');
          expect(record.attributes).to.not.exist;
        });
      })
      .end(done);
  });
  it('should NOT support the fields query param against singular models until the feature is enabled in Sails.js', function(done) {
    supertest(sails.hooks.http.app)
      .get('/authors/1/articles?include=author&fields[author]=name')
      .expect(400)
      .end(done);
  });
});
