import { controller } from './../../index';

const DummyController = new controller({
  hello(req, res) {
    return res.ok('Hello.');
  }
});

export default DummyController;
