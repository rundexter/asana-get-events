var _ = require('lodash'),
    util = require('./util.js'),
    request = require('request').defaults({
        baseUrl: 'https://app.asana.com/api/1.0/'
    }),
    pickInputs = {
        'resource': 'resource',
        'sync': 'sync'
    },
    pickOutputs = {
        'parent': { key: 'data', fields: ['parent'] },
        'created_at': { key: 'data', fields: ['created_at'] },
        'action': { key: 'data', fields: ['action'] },
        'type': { key: 'data', fields: ['type'] },
        'user_id': { key: 'data', fields: ['user.id'] },
        'user_name': { key: 'data', fields: ['user.name'] },
        'resource_id': { key: 'data', fields: ['resource.id'] },
        'resource_name': { key: 'data', fields: ['resource.name'] }
    };

module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var credentials = dexter.provider('asana').credentials('access_token'),
            inputs = util.pickInputs(step, pickInputs),
            validateErrors = util.checkValidateErrors(inputs, pickInputs);

        // check params.
        if (validateErrors)
            return this.fail(validateErrors);

        request.get({
            uri: 'events',
            qs: inputs,
            json: true,
            auth: {
                'bearer': credentials
            }
        }, function (error, response, body) {

            if (body && body.errors && body.sync)
                request.get({
                    uri: 'events',
                    qs: _.merge(inputs, {sync: body.sync}),
                    json: true,
                    auth: {
                        'bearer': credentials
                    }
                }, function (error, response, body) {
                    if (error || (body && body.errors) || response.statusCode >= 400)
                        this.fail(error || body.errors || { statusCode: response.statusCode, headers: response.headers, body: body });
                    else
                        this.complete(util.pickOutputs(body, pickOutputs) || {});

                }.bind(this));
            else
                (error || (body && body.errors))? this.fail(error || body.errors) : this.complete(util.pickOutputs(body, pickOutputs) || {});
        }.bind(this));
    }
};
