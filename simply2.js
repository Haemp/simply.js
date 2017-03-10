class Simply extends HTMLElement {

    render(htmlString){
        this.innerHTML = htmlString;
        this._compile();
    }

    update(){
        this._compile();
    }

    /**
     *
     * <node>
     *    <element sid="attrName"></element>
     * </node>
     *
     * Translates to
     *
     * node.attrName = element
     *
     * @param node The parent of the compile
     * @param element The element being compiled
     * @param attrName variable name
     */
    _compileRef({node, element, attrName}) {

        // if we've already compiled this once
        // we dont have to do it again
        if (!node.$$compiled) {
            const cleanName = this._snakeToCamel(attrName.replace(/^#/, ''));
            node[cleanName] = element;
            node.$$compiled = true;
        }
        //element.removeAttribute(attrName);
        //element.setAttribute('element-id', cleanName);
    }

    /**
     * Evaluate a javascript expression in a context
     * @param expression
     * @param context
     * @param propertyValue
     * @param element
     * @returns {*}
     */
    _evaluate(expression, context, propertyValue, element) {

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

    _compileCauseEffect({node, element, attrName, attrValue}) {

        if(element.$$compiled) return;

        let expression = attrValue;
        const cleanAttr = this._snakeToCamel(attrName.replace(/[\(\)]/g, ''));

        if (!expression) {
            expression = "$el.innerText = $value || ''";
        }


        element.addEventListener(cleanAttr, (event) => {
            this._evaluate(expression, node, event, element);
        })


        element.$$compiled = true;
    }

    _snakeToCamel(str) {
        return str.replace(/-([a-z])/g, function (g) {
            return g[1].toUpperCase();
        });
    }

    _compile() {
        const node = this;
        const refElements = [];
        const causeEffectElements = [];
        const allElements = [];
        let element;

        // because we dont want to compile the children of a simply element
        // or something that keeps control of its own inenr template
        const iterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT, {
            acceptNode: function (checkNode) {

                if (!(checkNode.parentElement instanceof Simply)) {
                    return NodeFilter.FILTER_ACCEPT;
                }else if(checkNode.parentElement == node){
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        });

        while ((element = iterator.nextNode())){

            if (element.attributes) {
                allElements.push(element);
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
                });
            }
        }

        refElements.forEach(({element, attrName}) => {
            this._compileRef({node, element, attrName})
        });

        causeEffectElements.forEach(({element, attrName, attrValue}) => {
            this._compileCauseEffect({node, element, attrName, attrValue});
        });

        allElements.forEach((element) => {
            this.emit('compile', undefined, element);
        })
    }

    emit(eventName, data, element){
        const event = new Event(eventName);
        event.data = data;
        if(element){
            element.dispatchEvent(event);
        }else{
            this.dispatchEvent(event);
        }
    }
}

