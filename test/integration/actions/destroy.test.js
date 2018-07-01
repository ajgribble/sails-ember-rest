import supertest from 'supertest';
const newArticle = {
  data: {
    type: 'articles',
    attributes: {
      title: 'I Woke Up in a Car'
    },
    relationships: {
      author: {
        data: {
          type: 'authors',
          id: '2'
        }
      }
    }
  }
};
let targetArticle = null;

describe('Integration | Action | destroy', function() {
  beforeEach(function(done) {
    Article.create(
      Object.assign({}, newArticle.data.attributes, { author: newArticle.data.relationships.author.data.id })
    ).exec((err, record) => {
      if (err) {
        return done(err);
      }
      targetArticle = record;
      done();
    });
  });

  describe(':: response format', function() {
    it('should respond with status code 204', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/articles/${targetArticle.id}`)
        .expect(204)
        .end(done);
    });
    it('should respond with Content-Type application/vnd.api+json', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/articles/${targetArticle.id}`)
        .expect(res => {
          expect(res.headers['content-type']).to.not.exist;
        })
        .end(done);
    });
    it('should return a null response text', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/articles/${targetArticle.id}`)
        .expect(res => {
          expect(res.text).to.equal('');
        })
        .end(done);
    });
  });

  describe(':: data integrity', function() {
    it('should return no articles', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/articles/${targetArticle.id}`)
        .expect(res => {
          expect(res.body).to.be.empty;
        })
        .end(done);
    });
    it('should remove target record from the database', function(done) {
      supertest(sails.hooks.http.app)
        .delete(`/articles/${targetArticle.id}`)
        .expect(res => {
          expect(res.body).to.be.empty;
        })
        .end(() => {
          supertest(sails.hooks.http.app)
            .get(`/articles/${targetArticle.id}`)
            .expect(404)
            .end(done);
        });
    });
  });
});
