describe('index page', function() {

  before(function() {
    this.server = http.createServer(app).listen(3333);
    this.browser = new Browser({site: 'http://localhost:3333' });
  });
  after(function(done) {
    this.browser.close();
    this.server.close(done);
    db = app.get('db');
    if (db) {
      db.close(function(err) {});
    }
  });

  beforeEach(function(done) {
    this.browser.visit('/', done);
  });

  it('should work', function() {
    assert.ok(this.browser.success);
  });

  it('should contain an add link', function() {
    assert.equal(this.browser.text('a#add'), 'Add');
  });

  it('should list available queries');
  it('When no queries availble it should say so');
});
