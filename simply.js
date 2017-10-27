const iDOM = require('incremental-dom');

// enforce { prop } formated attribute values
// to set the property instead of the attribute
iDOM.attributes[iDOM.symbols.default] = (element, name, value) => {
    if(name.includes('{')){
        return iDOM.applyProp(element, snakeToCamel(name.replace('{', '').replace('}', '')), value);
    }else{
        return iDOM.applyAttr(element, name, value);
    }
};

const registeredComponents = new Map();
// default settings
const settings = {
    showCompilationWarnings: false
};

/**
 * @param template
 * @constructor
 */
function SimplyRender(template){

    // no need for a "data" component, since we
    // assume that it will be attached to the node
    // but we add it as an optional for the cases where
    // the node needs data from a parent component for eaxample
    // in a forEach

    // 1. Parse the template into a DOM node
    // that we can parse for attributes
    const fragment = document.createDocumentFragment();
    const div = document.createElement('div');
    fragment.appendChild(div);
    div.innerHTML = preProcessTemplate(template);
    const dom = div;
    let iTemplate = generateTemplateFromNodes([...dom.childNodes]);

    // 3. Convert and return the string as a function

    return (thisNode, renderNode) => {

        if(!renderNode){
            renderNode = thisNode;
        }
        // this timeout is needed to queue up the contents
        // in the next javascript frame. This is necessary
        // to not trigger two nested patch operations.
        //
        // Nested patches will happen when the creation of a
        // new element triggers connectedCallback - which in turn
        // triggers a render. This all happens in one frame and
        // confuses the incremental-dom library.
        // so we use setTimeout to queue up the function for the
        // next frame.

        iDOM.patch(renderNode, () => {
            new Function('node', 'iDOM', 'settings', `
                ${iTemplate}
            `).call(thisNode, thisNode, iDOM, settings);
        });

    }

    // Notes on performance: if this walk becomes a nusance when
    // attached to custom component creation we could have all
    // the components compiled at startup - and then eventually
    // in a buildstep. Cross this bridge when you come to it

}

function generateTemplateFromNodes(templateNodes){
    return templateNodes.map((curTemplateNode) => {
        return generateTemplateRecusive(curTemplateNode);
    }).join('\n')
}

function generateTemplateRecusive(curNode){

    // accessible variables in the written functions
    // are `curNode and `node`

    // we wrap a iife to make sure the curNode
    // is accessible in the right scope for the
    // attrProps
    let iTemplate = `
        (function(){
            let curNode = null;
    `;
    const nodeType = curNode.nodeType;

    if(nodeType === HTMLElement.TEXT_NODE){

        // a text node is simple, no attributes
        // and no children. We can exit here
        iTemplate += addText(curNode.nodeValue);

    }else if(nodeType === HTMLElement.ELEMENT_NODE){

        // 2 Examine the attributes
        const tagName = curNode.tagName.toLowerCase();
        const attrProps = parseAttrProps(curNode.attributes);

        // if the node has an each attribute we need to
        // stamp that whole element according to its each
        // properties.
        if(attrProps.each){
            iTemplate += applyEach(attrProps.each, curNode);
        }else{
            if(attrProps.if) iTemplate += openIfStatement(attrProps.if);

            // 3 Open tag
            // if there is an if attrProp we wrap this
            // in an if statement
            // TODO: Void elements
            iTemplate += openTag(tagName, attrProps.staticAttributes);

            // 4 Apply the attributes
            iTemplate += applyAttributes(curNode.attributes, attrProps);

            // 5 Close open tag
            // curNode is now available in the written function
            iTemplate += closeOpenTag();

            // 4 Render children if applicable
            curNode.childNodes.forEach((childNode) => {
                iTemplate += generateTemplateRecusive(childNode);
            });

            // 5 Apply attribute properties
            iTemplate += applyAttrProps(attrProps, curNode);

            // 6 Close the tag
            iTemplate += closeElement(tagName);

            iTemplate += triggerCompiled();

            if(attrProps.if) iTemplate += closeIfStatement();
        }
    }

    iTemplate += `
        }).call(node);
    `;

    return iTemplate;

}

/**
 * When we're finished compiling an element we trigger a compiled
 * event to let the element initiate itself.
 *
 * Why not rely on the connectedCallback for this? Because the that
 * callback triggers on first connection with the DOM which is before
 * having had its attributes and attrProps assigned.
 */
function triggerCompiled(){
    return `
        if(curNode.$shouldWaitForCompile && curNode.$compiled != true){
            if(curNode.compiledCallback)
                curNode.compiledCallback();
                
            curNode.$shouldWaitForCompile = false;
            curNode.$compiled = true;
        }
    `;
}

function closeElement(tagName){
    return `
    iDOM.elementClose('${tagName}');
`
}

function openIfStatement(condition){

    // if a condition throws an error its false
    return `
        let condition;
        try{
            condition = ${condition}
        }catch(err){
            ${function () {
                if (settings.showCompilationWarnings) {
                    return `console.warn(err);`;
                }
            }()}
            condition = false;
        }
        if (condition) {
    `;
}

function closeIfStatement() {
    return `
    }
`;
}

function closeOpenTag() {

    // if the DOM element is being reused
    // from a previous one we need to clean the listeners
    // off.

    // check id of the DOM element
    // if separate
    return `
    curNode = iDOM.elementOpenEnd();
    curNode.$shouldWaitForCompile = true;
`;
}

function applyEach(each, curNode){
    const [item, collection] = each.split(' in ');
    let tmpl = '';

    // clean curNode from the each property before we start
    // stamping it - otherwise this will lead to an infinite loop
    curNode.removeAttribute('each');

    tmpl += wrapAndThrowError(`
        // generate repeating element
        ${collection}.forEach((${item}) => {
            ${generateTemplateRecusive(curNode)}
        });
    `);

    return tmpl;
}

function wrapAndThrowError(codeString){
    return `
        try{
            ${codeString}
        }catch(err){
            ${function () {
                if (settings.showCompilationWarnings) {
                    return `console.warn(err);`;
                }
            }()}
        }
    `;
}

function applyAttrProps(attrProps, curNode){
    let tmpl = '';
    if(attrProps.ref){
        tmpl += `
        if(!node.$) node.$ = {};
        node.$['${snakeToCamel(attrProps.ref)}'] = curNode;
    `;
    }

    // iDom likes to re-use dom elements instead of creating new ones
    // but this means that we have to clean up our own event listeners
    // else the listener from a previous object will be attached to
    // a newer (but reused) one.
    tmpl += `
        if(curNode.listeners && curNode.listeners.size > 0){
            curNode.listeners.forEach((callback, eventName) => {
                curNode.removeEventListener(eventName, callback)
            })
            curNode.listeners = new Map();
        }  
    `;

    if(attrProps.listeners.length > 0) {
        tmpl += `
            curNode.listeners = curNode.listeners || new Map();
        `;

        tmpl += attrProps.listeners.map((listener) => {
            return `
            if(!curNode.listeners.has('${listener.eventName}')){
                const listener = (e) => {
                    const $event = e;
                    const $evt = e;
                    const $element = curNode;
                    const $el = curNode;
                    ${listener.callback};
                };
                curNode.addEventListener('${listener.eventName}', listener);
                curNode.listeners.set('${listener.eventName}', listener);
            }
        `;
        }).join('\n ');
    }

    return tmpl;
}

function parseAttrProps(attrs, curNode){

    const attrProps = {
        listeners: [], // the event name and js string to evaluate
        ref: null, // the name of the ref
        if: null, // the condition in js
        show: null, // the condition in js
        each: null, // the formula and template
        staticAttributes: [] // list of normal attributes
    };
    [...attrs].forEach((attr) => {
        const attrName = attr.name;
        const attrValue = attr.value.trim();

        if (isEventAttr(attrName)) {
            const eventName = getEventName(attrName);
            attrProps.listeners.push({eventName, callback: attrValue});

        } else if (isRefAttr(attrName)) {
            attrProps.ref = getRefName(attrName);

        } else if (isEachAttr(attrName)) {
            attrProps.each = attrValue;

        } else if (isIfAttr(attrName)) {
            attrProps.if = attrValue;

        } else if (isShowAttr(attrName)) {
            attrProps.show = attrValue;
        } else {
            // If the attribute is a simple non iterpolatable
            // value we add it to the static array. This way
            // it can be applied immediately when we create the
            // DOM object - and will be present in the
            // connectionCallback call.
            if(!shouldInterpolateString(attrValue)){
                attrProps.staticAttributes.push({name: attrName, value: attrValue});
            }
        }
    });
    return attrProps;
}

function isShowAttr(attrName){
    return attrName === 'show';
}

function isIfAttr(attrName){
    return attrName === 'if';
}

function isEventAttr(attrName){
    return attrName.match(/^\(.+\)$/)
}

function getEventName(attrName){
    return attrName.replace(/[()]/g, '');
}

function isRefAttr(attrName){
    return attrName.match(/^#/);
}

function isEachAttr(attrName){
    return attrName === 'each';
}

function getRefName(attrName){
    return attrName.replace(/^#/, '');
}

function applyAttributes(attrs, attrProps){
    let tmpl = [...attrs].map(attr => {
        let attrValue = attr.value;
        let tmpl;
        if(shouldInterpolate(attrValue)){
            attrValue = cleanInterpolationTags(attrValue);
            tmpl = wrapAndThrowError(`
            iDOM.attr('${cleanAttrName(attr.name)}', ${attrValue});
        `);
        }else{
            tmpl = `
            iDOM.attr('${cleanAttrName(attr.name)}', '${escapeSingleQuotes(attrValue)}');
        `;
        }

        return tmpl;
    }).join('\n');

    // inject a show attribute toggle
    // if we have a show attribute property
    if(attrProps.show){
        tmpl += `
            iDOM.attr('style', !!${attrProps.show} ? '' : 'display: none;');
        `;
    }

    return tmpl;
}

/**
 * @param {String} tagName
 * @param {Array<{name: String, value: Mixed}>} staticAttrProps
 * @returns {string}
 */
function openTag(tagName, staticAttrProps){

    const props = staticAttrProps || [];
    const propsArray = props.reduce((prev, prop) => {
        return [...prev, prop.name, prop.value];
    }, []);
    const attributesString = JSON.stringify(propsArray);

    return `
        iDOM.elementOpenStart('${tagName}', '', ${attributesString});
    `
}

function addText(textValue){
    let text = textValue.trim();
    let tmpl = '';

    if(shouldInterpolateString(text)){

        // convert from {{ javascript }} => ${javascript}
        text = convertToTemplateVars(text);

        // it is possible that we get null pointers
        // anytime we are interpolating values
        // so we should capture those
        tmpl += wrapAndThrowError(`
            iDOM.text(\`${text}\`);
        `);

    }else{
        tmpl += `
            iDOM.text(\`${escapeBacktickQuotes(text)}\`);
        `;
    }

    return tmpl;
}

function cleanAttrName(attrName){
    if(isEventAttr(attrName)){
        return 'event-' + getEventName(attrName);
    }else if(isRefAttr(attrName)){
        return 'ref-' + getRefName(attrName);
    }else{
        return attrName;
    }
}

/**
 * Does the string include { } characters?
 * @param stringValue
 */
function shouldInterpolate(stringValue){
    return stringValue.match(/^{.+}$/);
}

function shouldInterpolateString(stringValue){
    return stringValue.match(/{{([\s\S]*?)}}/);
}

function cleanInterpolationTags(text){
    return text.replace(/[{}]/g, '');
}

function escapeSingleQuotes(text){
    return text.replace(/'/g, "\\'");
}

function escapeBacktickQuotes(text){
    return text.replace(/`/g, "\\`");
}

function getStringInterpolationValue(text){

    // match anything between {{ and }}
    return text.replace(/{{([\s\S]*?)}}/g, (match) => {
        // remove the interpolation indicators
        const js = match.replace(/{{|}}/g, '');
        return '${' + js + '}';
    });
}

function convertToTemplateVars(text){

    // match anything between {{ and }}
    return text.replace(/{{([\s\S]*?)}}/g, (match) => {
        // remove the interpolation indicators
        const js = match.replace(/{{|}}/g, '');

        // this prevents us from rendering undeclared
        // vars as an "undefined" string
        return '${' + js + ' === undefined ? "" : ' + js + '}';
    });
}

function snakeToCamel(str){
    return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

function camelToSnake(str){
    return str.replace(/([A-Z])/g, function($1){return "-"+$1.toLowerCase();});
}

function preProcessTemplate(template){

    // replace id refs with kebab-cased
    // <div #someId> -> <div #some-id
    return template.replace(/<([\s\S]+?)>/g, (matchTag) => {
        return matchTag.replace(/#([a-zA-Z]+?)[> ]/, (match) => {
            return camelToSnake(match)
        })
    })
}

class Component extends HTMLElement{

    static compile(){
        const render = SimplyRender(this.template);
        this.prototype.$shadyDom = this.shadyDom
        this.prototype.render = function () {

            // shadyDom means we render directly to the components innerHTML
            // this circumvents iDOM compilation of children
            return render(this, this.$shadyDom ? this : this.shadow);
        }

        if(this.props){
            this.props.forEach((prop) => {
                Object.defineProperty(this.prototype, prop, {
                    set: function (value) {
                        this['_'+prop] = value;
                        this.render();
                    },
                    get: function () {
                        return this['_'+prop];
                    }
                })
            })
        }

        // save user defined callback to schedule
        // connectedCallback AFTER compile to ensure
        // we have all state set before we start manipulation
        const userDefinedCallback = this.prototype.connectedCallback;

        // connectedCallback triggers rendering routine
        this.prototype.connectedCallback = function(){
            this.render();

            if(!this.$shouldWaitForCompile){
                if(userDefinedCallback)
                    userDefinedCallback.call(this);
            }
        }

        // rendering routine triggers compiled callback
        this.prototype.compiledCallback = function () {

            if(userDefinedCallback)
                userDefinedCallback.call(this);

            // We render again to pickup the compiled values
            // TODO: This could be refactored for efficiency
            this.render();
        }
    }

    static define(tagName){
        if(registeredComponents.has(tagName)){
            throw new Error('You\'re trying to define ' + tagName + ' twice');
            return;
        }
        this.compile();
        customElements.define(tagName, this);
        registeredComponents.set(tagName, this);
    }

    constructor(){
        super();
        if(!this.$shadyDom)
            this.shadow = this.attachShadow({mode: 'open'});
    }

    static get template(){
        throw Error('Template methods needs to be overriden by compoent');
    }
}


module.exports = {
    settings,
    define: function(tagName, classDefinition){
        classDefinition.compile();
        customElements.define(tagName, classDefinition);
    },
    compileTemplate: SimplyRender,
    iDOM,
    Component: Component,
    preProcessTemplate
};

