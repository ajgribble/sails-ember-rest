import supertest from 'supertest';

describe('Integration | Controllers | MediaOutlet', function() {
    describe(':: include', function() {
        it('should load publishers with outlets', function(done) {
            supertest(sails.hooks.http.app)
            .get('/mediaOutlets?include=publishers')
            .expect(200)
            .then(response => {
                const body = response.body;
                expect(body.included).to.be.an('array');
                expect(body.included.length).to.equal(2);
                done();
            }).catch(done);
        });

        it('should have camel case relationship links', function(done) {
            supertest(sails.hooks.http.app)
            .get('/mediaOutlets')
            .expect(200)
            .then(response => {
                response.body.data.forEach(data => {
                    expect(data.relationships.publishers.links.related.href).to.include('mediaOutlets');
                });
                done();
            }).catch(done);
        })
    });
});