/*
Copyright (c) 2011 Tim Caswell <tim@creationix.com>

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Inspired by http://github.com/willconant/flow-js, but reimplemented and
// modified to fit my taste and the node.JS error handling system.
function Step() {
    var steps = Array.prototype.slice.call(arguments),
        pending, counter, results, lock;

    // Define the main callback that's given as `this` to the steps.
    function next() {
        counter = pending = 0;

        // Check if there are no steps left
        if (steps.length === 0) {
            // Throw uncaught errors
            if (arguments[0]) {
                // 最后一步如果抛出异常，则向外throw
                throw arguments[0];
            }
            return;
        }

        // Get the next step to execute
        var fn = steps.shift(); // 取出一个函数
        console.log(fn);
        results = []; // 存放所有结果

        // Run the step in a try..catch block so exceptions don't get out of hand.
        try {
            lock = true;
            // result 记录同步结果
            var result = fn.apply(next, arguments); // this is next;
        } catch (e) {
            // Pass any exceptions on through the next callback
            next(e);
        }

        // 如果回调函数传入的是this，会有写的程序调用。this即next即cb;
        // 需要手动触发next的情况。counter > 0表示调用了parallel
        if (counter > 0 && pending == 0) {
            // If parallel() was called, and all parallel branches executed
            // synchronously, go on to the next step immediately.
            next.apply(null, results);
        } else if (result !== undefined) { // 同步方式。异步方式自动调用，异步时this即为next，相当于手动调用了next。
            // If a synchronous return is used, pass it to the callback
            next(undefined, result);
        }
        lock = false;
    }

    // Add a special callback generator `this.parallel()` that groups stuff.
    next.parallel = function() {
        var index = 1 + counter++; // 存放结果的索引
        pending++;

        return function() { // cb(null, '');
            pending--;
            // 第一个结果放置error
            // Compress the error from any result to the first argument
            if (arguments[0]) {
                results[0] = arguments[0];
            }
            // Send the other results as arguments
            results[index] = arguments[1]; // 结果 相当于cb(null, '');
            if (!lock && pending === 0) {
                // When all parallel branches done, call the callback
                next.apply(null, results);
            }
        };
    };

    // Generates a callback generator for grouped results
    next.group = function() {
        var localCallback = next.parallel();
        var counter = 0;
        var pending = 0;
        var result = [];
        var error = undefined;

        function check() {
            if (pending === 0) {
                // When group is done, call the callback
                localCallback(error, result); // all result
            }
        }
        process.nextTick(check); // Ensures that check is called at least once

        // Generates a callback for the group
        return function() {
            var index = counter++;
            pending++;
            return function() { // cb(null, '');
                pending--;
                // Compress the error from any result to the first argument
                if (arguments[0]) {
                    error = arguments[0];
                }
                // Send the other results as arguments
                result[index] = arguments[1];
                if (!lock) {
                    check();
                }
            };
        };
    };

    // Start the engine an pass nothing to the first step.
    next();
}

// Tack on leading and tailing steps for input and output and return
// the whole thing as a function.  Basically turns step calls into function
// factories.
// Step.fn(f1, f2, f3)();
Step.fn = function StepFn() {
    var steps = Array.prototype.slice.call(arguments);
    return function() {
        var args = Array.prototype.slice.call(arguments);

        // Insert a first step that primes the data stream
        var toRun = [function() {
            this.apply(null, args);
        }].concat(steps);

        // If the last arg is a function add it as a last step
        if (typeof args[args.length - 1] === 'function') {
            toRun.push(args.pop());
        }


        Step.apply(null, toRun);
    }
}


// Hook into commonJS module systems
if (typeof module !== 'undefined' && "exports" in module) {
    module.exports = Step;
}
