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
    div.innerHTML = template;
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
            new Function('node', `
                ${iTemplate}
            `).call(thisNode, thisNode);
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

            // if there isnt an each clause we
            // carry on parsing like usual
        }else{
            if(attrProps.if) iTemplate += openIfStatement(attrProps.if);

            // 3 Open tag
            // if there is an if attrProp we wrap this
            // in an if statement
            // TODO: Void elements
            iTemplate += openTag(tagName, attrProps);

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

            if(attrProps.if) iTemplate += closeIfStatement();
        }
    }

    iTemplate += `
        }).call(node);
    `;
    return iTemplate;

}

function closeElement(tagName){
    return `
    Simply.iDOM.elementClose('${tagName}');
`
}

function openIfStatement(condition){
    return `
    if (${condition}) {
`;
}

function closeIfStatement() {
    return `
    }
`;
}

function closeOpenTag() {
    return `
    curNode = Simply.iDOM.elementOpenEnd();
`;
}

function applyEach(each, curNode){
    const [item, collection] = each.split('in');
    let tmpl = '';


    // clean curNode from the each property before we start
    // stamping it - otherwise this will lead to an infinite loop
    curNode.removeAttribute('each');

    tmpl += `
        // generate repeating element
        ${collection}.forEach((${item}) => {
            ${generateTemplateRecusive(curNode)}
        });
    `;

    return tmpl;
}

function applyAttrProps(attrProps, curNode){
    let tmpl = '';
    if(attrProps.ref){
        tmpl += `
        if(!node.$) node.$ = {};
        node.$['${snakeToCamel(attrProps.ref)}'] = curNode;
    `;
    }

    if(attrProps.listeners.length > 0) {
        tmpl += `
            curNode.listeners = curNode.listeners || [];
        `;

        tmpl += attrProps.listeners.map((listener) => {
            return `
            if(!curNode.listeners.includes('${listener.eventName}')){
                curNode.addEventListener('${listener.eventName}', (e) => {
                    const $event = e;
                    const $element = curNode;
                    ${listener.callback};
                });
                curNode.listeners.push('${listener.eventName}');
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
        each: null // the formula and template
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
            tmpl = `
            Simply.iDOM.attr('${cleanAttrName(attr.name)}', ${attrValue});
        `;
        }else{
            tmpl = `
            Simply.iDOM.attr('${cleanAttrName(attr.name)}', '${escapeSingleQuotes(attrValue)}');
        `;
        }

        return tmpl;
    }).join('\n');

    // inject a show attribute toggle
    // if we have a show attribute property
    if(attrProps.show){
        tmpl += `
            Simply.iDOM.attr('style', !!${attrProps.show} ? '' : 'display: none;');
        `;
    }

    return tmpl;
}

function openTag(tagName, attrProps){
    return `
        Simply.iDOM.elementOpenStart('${tagName}', ${attrProps.id});
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
        tmpl += `
            try{
                Simply.iDOM.text(\`${text}\` || '');
            }catch(e){
                console.error(e);
            }
        `;
    }else{
        tmpl += `
            Simply.iDOM.text(\`${escapeBacktickQuotes(text)}\`);
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


function convertToTemplateVars(text){

    // match anything between {{ and }}
    return text.replace(/{{([\s\S]*?)}}/g, (match) => {
        // remove the interpolation indicators
        const js = match.replace(/{{|}}/g, '');
        return '${' + js + '}';
    });
}

function snakeToCamel(str){
    return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

class Component extends HTMLElement{

    static compile(){
        const render = SimplyRender(this.template);
        this.prototype.render = function () {
            return render(this, this.shadow);
        }
    }

    constructor(){
        super();
        this.shadow = this.attachShadow({mode: 'open'});
    }

    static get template(){
        throw Error('Template methods needs to be overriden by compoent');
    }
}

module.exports = {
    compileTemplate: SimplyRender,
    iDOM,
    Component: Component
};

