import supertest from 'supertest';

describe('Integration | Controllers | Publisher', function() {
    describe(':: include', function() {
        it('should load publishers with outlets', function(done) {
            supertest(sails.hooks.http.app)
            .get('/publishers?include=outlet')
            .expect(200)
            .then(response => {
                const body = response.body;
                expect(body.included).to.be.an('array');
                expect(body.included.length).to.equal(2);
                done();
            }).catch(done);
        });
    });
});