(function (window, define) {

    class Simply {

        static get functions() {
            return {
                '$repeat': Simply.repeat,
                '$show': Simply.show
            };
        }

        static proxify(obj) {
            obj = obj || {};

            return new Proxy(Object.assign(obj, {
                observers: {},
                off(prop, targetFunc){
                    this.observers[prop] = this.observers[prop].filter((func) => {
                        return targetFunc !== func;
                    })
                },

                on(prop, listenerFunction){
                    if (!this.observers[prop]) {
                        this.observers[prop] = [];
                    }

                    this.observers[prop].push(listenerFunction);
                },

                trigger(prop, value){
                    if (this.observers[prop]) {
                        this.observers[prop].forEach((listenerFunction) => {
                            console.log('triggering change');
                            listenerFunction(value);
                        })
                    }
                },
                $isProxy: true
            }), {
                set: (target, property, value) => {
                    target[property] = value;
                    target.trigger(property, value);
                    return true;
                }
            })
        }

        static show(el, show) {
            if (!show) {
                el.style.display = 'none';
            } else {
                el.style.display = 'block';
            }
        }

        static compileRef({node, element, attrName}) {
            const cleanName = Simply.snakeToCamel(attrName.replace(/^#/, ''));
            node[cleanName] = element;
            element.removeAttribute(attrName);
            element.setAttribute('element-id', cleanName);
        }

        static evaluate(expression, context, propertyValue, element) {

            expression = expression.trim();
            var semi = expression.lastIndexOf(';');
            if (semi === -1) {
                expression = 'return ' + expression;
            } else {
                expression = expression.slice(0, semi) + '; return (' + expression.substr(semi + 1) + ')';
            }

            let cleanExec = expression.replace(/#/g, 'this.');
            let f = new Function(['$value', '$el'], cleanExec)
            return f.apply(context, [propertyValue, element]);
        }

        static compileCauseEffect({node, element, attrName, attrValue}) {
            let expression = attrValue;
            const cleanAttr = Simply.snakeToCamel(attrName.replace(/[\(\)]/g, ''));

            if (!expression) {
                expression = "$el.innerText = $value || ''";
            }

            // check if there is a dot - that means we have to take
            // the target into account
            if (cleanAttr.includes('.')) {



                let [target, property] = cleanAttr.split('.');

                // if we're using $self we refer to the container
                // element root as the base for the property lookup.
                // this requires the node to be a Model
                // HTML elements uses events and models uses propety assignments
                if (node[target] instanceof HTMLElement) {
                    node[target].addEventListener(property, (event) => {
                        Simply.evaluate(expression, node, event, element);
                    })
                } else {

                    if (!node[target]) {
                        console.info('Auto Declaring model for: ', target, ' on ', node);
                        node[target] = Simply.proxify(property === 'length' ? [] : {});
                    }

                    if (!node[target].$isProxy) {
                        console.info('Auto Wrapping model for: ', target, ' on ', node);
                        node[target] = Simply.proxify(node[target]);
                    }

                    node[target].on(property, (propertyValue) => {
                        Simply.evaluate(expression, node, propertyValue, element);
                    });

                    // trigger to get the first state of the element
                    if (node[target][property]) {
                        Simply.evaluate(expression, node, node[target][property], element);
                    }
                }

            } else {

                if (cleanAttr === '$compiled') {
                    Simply.evaluate(expression, node, event, element);
                } else {
                    element.addEventListener(cleanAttr, (event) => {
                        Simply.evaluate(expression, node, event, element);
                    })
                }
            }

            element.removeAttribute(attrName);
            element.setAttribute('data-cause-effect', attrName + '="' + expression + '"');
        }

        static repeat(node, array, dataName) {
            // node === $el

            if (!node.trigger) {
                node.trigger = (eventName, data) => {
                    const event = new Event(eventName);
                    event.data = data;
                    node.dispatchEvent(event);
                };
            }

            // fetch current element
            const elements = Array.prototype.slice.call(node.children).slice(1);

            if (elements.length === array.length) {
                // check if reordered


            } else if (elements.length > array.length) {
                // remove element mode

                // what do we add?
                // where do we add it - element order should follow
                // array order. so array[i] === element[i]
                let numElements = elements.length;
                for (let i = 0; i < elements.length; i++) {

                    // there is an element registered without
                    // a data item present
                    if (elements[i][dataName] !== array[i]) {
                        elements[i].remove();
                        elements.splice(i, 1);
                        i--;
                    } else {
                        elements[i].$index = i;
                    }
                }
            } else {
                // add element mode
                const tmpl = node.querySelector('template');
                for (let i = 0; i < array.length; i++) {

                    // there is a data item registered
                    // without an element
                    if (!elements[i] || array[i] !== elements[i][dataName]) {

                        // wrapper for to behave as #/this for the
                        // template
                        let wrapper = document.createElement('div');
                        let instance = document.importNode(tmpl.content, true);
                        wrapper.appendChild(instance);

                        // we prepopulate the element with the model
                        // value so it is there when we compile
                        if (!array[i].$isProxy) array[i] = Simply.proxify(array[i]);
                        wrapper[dataName] = array[i];

                        // give the items access to the parent
                        // element
                        wrapper.$repeatEl = node;
                        wrapper.$index = i;

                        if (elements.length === 0) {
                            node.appendChild(wrapper);
                        } else {
                            node.children[i].insertAdjacentElement('afterend', wrapper);
                        }

                        Simply.compile(wrapper);
                    }
                }
            }
        }

        static snakeToCamel(str) {
            return str.replace(/-([a-z])/g, function (g) {
                return g[1].toUpperCase();
            });
        }

        static compileFunction({node, element, attrName}) {
            element[attrName] = function () {
                Simply.functions[attrName].apply(this, [element, ...arguments]);
            }
        }

        static compile(node) {

            const refElements = [];
            const causeEffectElements = [];
            const functionElements = [];

            Array.prototype.slice.apply(node.querySelectorAll('*')).forEach((element) => {

                // check if we have an attribute that is a watch
                if (element.attributes) {
                    Array.prototype.slice.apply(element.attributes).forEach((attr) => {
                        const attrName = attr.name;
                        const attrValue = attr.value;

                        // check if identifier
                        if (attrName.match(/^#/)) {
                            return refElements.push({element, attrName});
                        }

                        // check if action
                        if (attrName.match(/(^\(.+\))/)) {
                            return causeEffectElements.push({element, attrName, attrValue});
                        }

                        // check if function
                        if (attrName.match(/^\$/)) {
                            return functionElements.push({element, attrName, attrValue});
                        }
                    });
                }
            });

            refElements.forEach(({element, attrName}) => {
                Simply.compileRef({node, element, attrName})
            });

            functionElements.forEach(({element, attrName, attrValue}) => {
                Simply.compileFunction({node, element, attrName, attrValue})
            });

            causeEffectElements.forEach(({element, attrName, attrValue}) => {
                Simply.compileCauseEffect({node, element, attrName, attrValue});
            });

        }
    }

    if (!define) {
        window.Simply = Simply;
    } else {
        define(function () {
            return Simply;
        })
    }

})(this, define);