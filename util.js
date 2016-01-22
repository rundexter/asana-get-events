/**
 * System functional.
 *
 * Version 2.0.0
 *
 * @type {exports|module.exports}
 * @private
 */

var _ = require('lodash');

module.exports = {
    /**
     * Return pick result.
     *
     * @param output
     * @param templateInputs
     * @returns {*}
     */
    pickOutputs: function (output, templateInputs) {
        var result = _.isArray(templateInputs)? [] : {};
        // map template keys
        _.map(templateInputs, function (templateValue, templateKey) {

            var outputValueByKey = _.get(output, templateValue.key || templateValue, undefined);
            if (_.isUndefined(outputValueByKey)) {
                result = _.isEmpty(result)? undefined : result;
                return;

            } else if (_.isUndefined(result)) {
                result = _.isArray(templateInputs)? [] : {};
            }

            // if template key is object - transform, else just save
            if (_.isArray(templateInputs)) {
                result = outputValueByKey;

            } else if (_.isObject(templateValue)) {
                // if data is array - map and transform, else once transform
                if (_.isArray(outputValueByKey)) {
                    var mapPickArrays = this._mapPickArrays(outputValueByKey, templateKey, templateValue);
                    result = _.isEmpty(result)? mapPickArrays : _.merge(result, mapPickArrays);

                } else {
                    result[templateKey] = this.pickOutputs(outputValueByKey, templateValue.fields);
                }
            } else {
                _.set(result, templateKey, outputValueByKey);
            }
        }, this);

        return result;
    },

    /**
     * Transform inputs to string and return data.
     *
     * @param step
     * @param templateInputs
     *
     * @returns {{}}
     */
    pickInputs: function (step, templateInputs) {
        var resultObject = {};

        _.map(templateInputs, function (attrSetName, attrName) {
            var locOnceVal = step.input(attrName).first(),
                locKeyName = attrSetName.key || attrSetName;

            if (locOnceVal !== null && locOnceVal !== undefined) {
                if (!attrSetName.type || attrSetName.type === 'string')
                    _.set(resultObject, locKeyName, _(locOnceVal).toString().trim());

                else if (attrSetName.type === 'boolean')
                    _.set(resultObject, locKeyName, _(locOnceVal).toString().toLowerCase() === 'true');

                else if (attrSetName.type === 'integer')
                    _.set(resultObject, locKeyName, _.parseInt(locOnceVal));

                else
                    _.set(resultObject, locKeyName, step.input(attrName).toArray());
            }
        });

        return resultObject;
    },

    checkValidateErrors: function (inputs, templateInputs) {
        var noValid = {};

        _.map(templateInputs, function (keyObj) {
            var keyObjName = keyObj.key || keyObj,
                inputValue = _.get(inputs, keyObjName),

                keyObjEnum = _.get(keyObj, 'validate.enum'),
                keyObjValidate = _.get(keyObj, 'validate.check'),
                keyObjError = _.get(keyObj, 'validate.error') || 'Validate error for field '.concat(keyObjName);

            if (inputValue !== null && inputValue !== undefined && keyObjValidate) {
                var validateFunction = _.isFunction(keyObjValidate)? keyObjValidate : this._validationRules[keyObjValidate];

                if (_.isFunction(validateFunction)) {
                    if (!validateFunction(inputValue))
                        noValid[keyObjName] = keyObjError;

                } else {
                    noValid[keyObjName] = 'Validation key error. [validate.check] must be function or name validation rule.'
                }
            }

            if (keyObjEnum && _.isArray(keyObjEnum) && (keyObjEnum.indexOf(inputValue) === -1))
                noValid[keyObjName] = 'Field [' + keyObjName + '] value not in (' + keyObjEnum.join() + ').';

            if ((inputValue === null || inputValue === undefined) && _.get(keyObj, 'validate.req') === true)
                noValid[keyObjName] = 'Field [' + keyObjName + '] is required.';

        }.bind(this));

        return _.isEmpty(noValid)? false : noValid;
    },

    _validationRules: {
        /**
        * URL validation
        * @param url
        * @returns {*}
        */
        checkUrl: function (url) {
            var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
            var regex = new RegExp(expression);

            return url.match(regex) ? true : false;
        },
        /**
        * Alphanumeric validation
        * @param str
        * @returns {boolean}
        */
        checkAlphanumeric: function (str) {
            var expression = /^[a-z0-9]+$/i;
            var regex = new RegExp(expression);

            return str.match(regex) ? true : false;
        }
    },

    /**
     * System func for pickOutputs.
     *
     * @param mapValue
     * @param templateKey
     * @param templateObject
     * @returns {*}
     * @private
     */
    _mapPickArrays: function (mapValue, templateKey, templateObject) {
        var arrayResult = [],
            result = templateKey === '-'? [] : {};

        _.map(mapValue, function (inOutArrayValue) {
            var pickValue = this.pickOutputs(inOutArrayValue, templateObject.fields);

            if (pickValue !== undefined)
                arrayResult.push(pickValue);
        }, this);

        if (templateKey === '-') {

            result = arrayResult;
        } else {

            result[templateKey] = arrayResult;
        }

        return result;
    }
};
