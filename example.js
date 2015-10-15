var Step = require('./lib/step');

function say(what, cb) {
    return cb(null, what);
}

Step(
    function step_1() {
        say('haha', this);
    },
    function step_2(err, what) {
        // say(what + '_', this);
        return what + '_';
    },
    function step_3(err, say) {
        console.log(err, say);
    });


Step.fn(function step_1() {
        say('haha', this);
    },
    function step_2(err, what) {
        // say(what + '_', this);
        return what + '_';
    },
    function step_3(err, say) {
        console.log(err, say);
    })()
