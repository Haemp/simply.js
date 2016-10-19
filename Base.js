
class Model{

    static proxify(obj){
        return new Proxy(Object.assign(obj, {
            observers: {},
            off(prop, targetFunc){
                this.observers[prop] = this.observers[prop].filter((func) => {
                    return targetFunc !== func;
                })
            },

            on(prop, listenerFunction){
                if(!this.observers[prop]){
                    this.observers[prop] = [];
                }

                this.observers[prop].push(listenerFunction);
            },

            trigger(prop, value){
                if(this.observers[prop]){
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

    constructor(base){

        Object.assign(this, base);
        this.observers = {};

        return new Proxy(this, {
            set: (target, property, value) => {
                target[property] = value;
                target.trigger(property, value);
                return true;
            }
        });
    }

    off(prop, targetFunc){
        this.observers[prop] = this.observers[prop].filter((func) => {
            return targetFunc !== func;
        })
    }

    on(prop, listenerFunction){
        if(!this.observers[prop]){
            this.observers[prop] = [];
        }

        this.observers[prop].push(listenerFunction);
    }

    trigger(prop, value){
        if(this.observers[prop]){
            this.observers[prop].forEach((listenerFunction) => {
                console.log('triggering chanhe');
                listenerFunction(value);
            })
        }
    }

}

/**
 * Syntax quibbles
 * <div #some-id (model.some-property)="doThis()" ></div> <--- this on
 * <div #="someId" (model)="property => doThis()" ></div>
 *
 * posibility to add qualifiers to the events like
 * (click if($value.key === ENTER))
 */
// TODO: (model.state)="" is automativally bound to innerHTML
// value = value || ''
// TODO (model.state)="$self.innerText" - no need for separate ref
// TODO Need a way to access properties on the container
// TODO: Refs in the first part of the action should also have the hash (#model)
// TODO: Add conditional causes
// TODO: finalize semantics of $el and $self
// TODO change naming to set (cause)="effect"
// (cause)="effect"
// TODO: implement clean up for repeater or a controlled repeater
// TODO: View toggler
class Base extends HTMLElement{
    static get functions(){
        return {
            '$repeat': Base.repeat,
            '$http': Base.http
        };
    }

    static http(node, el, url){

        fetch(url).then(() => {
            el.trigger('result');
        });
    }

    static compileRef({node, element, attrName}){
        const cleanName = Base.snakeToCamel(attrName.replace(/^#/, ''));
        node[cleanName] = element;
        element.removeAttribute(attrName);
        element.setAttribute('element-id', cleanName);
    }

    static evaluate(expression, context, propertyValue, element){
        //try{
        // TODO: Return value
        expression = expression.trim();

        var semi = expression.lastIndexOf(';');
        if(semi === -1){
            expression = 'return ' + expression;
        }else{
            expression = expression.slice(0, semi) + '; return (' + expression.substr(semi+1) + ')';    
        }
        

        //expression.replace(/\;(?=[^.]*$)/, '')
        let cleanExec = expression.replace(/#/g, 'this.');
        let f = new Function(['$value', '$el'], cleanExec)
        return f.apply(context, [propertyValue, element]);

        //}catch(err){
        //    console.error(expression, context, element, propertyValue);
        //    console.error(err);
        //}
    }

    /**
     * <div> <--- node
     *     <span (attrName)="attrValue"></span> <--- element
     * </div>
     * @param node
     * @param element
     * @param attrName
     * @param attrValue
     */
    static compileCauseEffect({node, element, attrName, attrValue}){
        let expression = attrValue;
        const cleanAttr = Base.snakeToCamel(attrName.replace(/[\(\)]/g, ''));

        if(!expression){
            expression = "$el.innerText = $value || ''";
        }

        // check if there is a dot - that means we have to take
        // the target into account
        if (cleanAttr.includes('.')) {

            let [target, property] = cleanAttr.split('.');

            // if we're using $self we refer to the container
            // element root as the base for the property lookup.
            // this requires the node to be a Model
            // TODO Write try catch with better error
            // HTML elements uses events and models uses propety assignments
            if(node[target] instanceof HTMLElement){
                node[target].addEventListener(property, (event) => {
                    Base.evaluate(expression, node, event, element);
                })
            }else{

                if(!node[target]){
                    console.info('Auto Declaring model for: ', target, ' on ', node);
                    node[target] = Model.proxify(property === 'length' ? [] : {});
                }

                if(!node[target].$isProxy){
                    console.info('Auto Wrapping model for: ', target, ' on ', node);
                    node[target] = Model.proxify(node[target]);
                }

                node[target].on(property, (propertyValue) => {
                    Base.evaluate(expression, node, propertyValue, element);
                });

                // trigger to get the first state of the element
                Base.evaluate(expression, node, node[target][property], element);
            }

        }else{

            if(cleanAttr === '$compiled'){
                Base.evaluate(expression, node, event, element);
            }else{
                element.addEventListener(cleanAttr, (event) => {
                    Base.evaluate(expression, node, event, element);
                })
            }
        }

        element.removeAttribute(attrName);
        element.setAttribute('data-cause-effect', attrName + '="' + expression+ '"');
    }

    /**
     * @deprecated
     * @param node
     */
    static cleanListeners({node}){
        node.querySelectorAll('*').forEach((element) => {

            // check if we have an attribute that is a watch
            // TODO: Always apply id before cause effect
            Array.prototype.slice.apply(element.attributes).forEach((attr) => {
                const attrName = attr.name;
                const attrValue = attr.value;

                // check if action
                if (attrName.match(/(^\(.+\))/)) {
                    return;
                }

            });
        });
    }

    static repeat(node, array, dataName){
        // node === $el


        if(!node.trigger){
            node.trigger = (eventName, data) => {
                const event = new Event(eventName);
                event.data = data;
                node.dispatchEvent(event);
            };
        }

        // fetch current element
        const elements = Array.prototype.slice.call(node.children).slice(1);

        if(elements.length === array.length){
            // check if reordered


        }else if(elements.length > array.length){
            // remove element mode

            // what do we add?
            // where do we add it - element order should follow
            // array order. so array[i] === element[i]
            let numElements = elements.length;
            for(let i = 0; i < elements.length; i++){

                // there is an element registered without
                // a data item present
                if(elements[i][dataName] !== array[i]){
                    elements[i].remove();
                    elements.splice(i, 1);
                    i--;
                }else{
                    elements[i].$index = i;
                }
            }
        }else{
            // add element mode
            const tmpl = node.querySelector('template');
            for(let i = 0; i < array.length; i++){

                // there is a data item registered
                // without an element
                if(!elements[i] || array[i] !== elements[i][dataName]){



                    // wrapper for to behave as #/this for the
                    // template
                    let wrapper = document.createElement('div');
                    let instance = document.importNode(tmpl.content, true);
                    wrapper.appendChild(instance);

                    // we prepopulate the element with the model
                    // value so it is there when we compile
                    if(!array[i].$isProxy) array[i] = Model.proxify(array[i]);
                    wrapper[dataName] = array[i];

                    // give the items access to the parent
                    // element
                    wrapper.$repeatEl = node;
                    wrapper.$index = i;

                    if(elements.length === 0){
                        node.appendChild(wrapper);
                    }else{
                        node.children[i].insertAdjacentElement('afterend', wrapper);
                    }

                    Base.compile(wrapper);
                }
            }
        }


        // TODO: Perf improvement - can do this better

        // clean up DOM
        // (data) -(listeners)-> (element)
        // no the data actually contains the behaviour to act on the
        // element
        // So the element reference is baked into the listener
        // which if we remove the element from the DOM will be an empty
        // listener.
        // we need to know what listeners we clean up
        // if the actual piece of data is removed it's no worry, it will
        // just stop sending events on update
        // 1) check diff
        // 2) add / remove / update mode
        // 3) if add we have a data item that is not represented by an element
        //    we can store this information in the repeater. We can
        // 4) If we have less elements in the new array
        // element.querySelectorAll('*:not(template)').forEach((childEl) => {
        //     //Base.cleanListeners({childEl})
        //     childEl.remove();
        // });
        //
        // // now we need to clean up the listeners set by those elements
        // if(array){
        //     array.forEach((arrayItem) => {
        //
        //         // wrapper for to behave as #/this for the
        //         // template
        //         let wrapper = document.createElement('div');
        //         let instance = document.importNode(tmpl.content, true);
        //         wrapper.appendChild(instance);
        //
        //         // we prepopulate the element with the model
        //         // value so it is there when we compile
        //         wrapper[arrayItemName] = arrayItem;
        //
        //         // give the items access to the parent
        //         // element
        //         wrapper.$repeat = element;
        //
        //         Base.compile(wrapper);
        //         element.appendChild(wrapper);
        //     });
        // }


    }

    // TODO: Problem with re-rendering
    // will apply the listeners again - we might be able to check
    // if the given expression is already registered
    static compileRepeat({node, element, attrValue}){
        let expression = attrValue;

        // repeater adds trigger to the current element
        element.trigger = (eventName, data) => {
            const event = new Event(eventName);
            event.data = data;
            element.dispatchEvent(event);
        };

        let refresh = () => {
            const tmpl = element.querySelector('template');
            const [arrayItemName, arrayRef] = expression.split(' in ');
            let array = Base.evaluate(arrayRef, node, null, element);
            let [model, prop] = arrayRef.replace('#', '').split('.');
            //let array = node[model][prop];

            // TODO: Perf improvement - can do this better

            // clean up DOM
            // (data) -(listeners)-> (element)
            // no the data actually contains the behaviour to act on the
            // element
            // So the element reference is baked into the listener
            // which if we remove the element from the DOM will be an empty
            // listener.
            // we need to know what listeners we clean up
            // if the actual piece of data is removed it's no worry, it will
            // just stop sending events on update
            // 1) check diff
            // 2) add / remove / update mode
            // 3) if add we have a data item that is not represented by an element
            //    we can store this information in the repeater. We can
            // 4) If we have less elements in the new array
            element.querySelectorAll('*:not(template)').forEach((childEl) => {
                //Base.cleanListeners({childEl})
                childEl.remove();
            });

            // now we need to clean up the listeners set by those elements
            if(array){
                array.forEach((arrayItem) => {

                    // wrapper for to behave as #/this for the
                    // template
                    let wrapper = document.createElement('div');
                    let instance = document.importNode(tmpl.content, true);
                    wrapper.appendChild(instance);

                    // we prepopulate the element with the model
                    // value so it is there when we compile
                    wrapper[arrayItemName] = arrayItem;

                    // give the items access to the parent
                    // element
                    wrapper.$repeat = element;

                    Base.compile(wrapper);
                    element.appendChild(wrapper);
                });
            }
        };
        refresh();


        element.repeat = refresh;
        element.removeAttribute(name);
        element.setAttribute('data-repeat', expression);
    }

    static snakeToCamel(str){
        return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    }

    static compileFunction({node, element, attrName}){
        element[attrName] = Base.functions[attrName];
    }

    static compile(node){

        const refElements = [];
        const causeEffectElements = [];
        const functionElements = [];

        Array.prototype.slice.apply(node.querySelectorAll('*')).concat(node).forEach((element) => {

            // check if we have an attribute that is a watch
            // TODO: Always apply id before cause effect
            Array.prototype.slice.apply(element.attributes).forEach((attr) => {
                const attrName = attr.name;
                const attrValue = attr.value;

                // check if identifier
                if(attrName.match(/^#/)){
                    return refElements.push({element, attrName});
                }

                // check if action
                if (attrName.match(/(^\(.+\))/)) {
                    return causeEffectElements.push({element, attrName, attrValue});
                }

                // check if function
                if(attrName.match(/^\$/)){
                    return functionElements.push({element, attrName, attrValue});
                }
            });
        });

        refElements.forEach(({element, attrName}) => {
            Base.compileRef({node, element, attrName})
        });

        functionElements.forEach(({element, attrName, attrValue}) => {
            Base.compileFunction({node, element, attrName, attrValue})
        });
        
        causeEffectElements.forEach(({element, attrName, attrValue}) => {
            Base.compileCauseEffect({node, element, attrName, attrValue});
        });

    }
    render(template){
        this.innerHTML = template;
        Base.compile(this);
    }
}


/**
 * - [ ] Master detail
 * - [ ] Repeat list
 */
document.registerElement('ah-test', class Test extends Base{
    createdCallback(){

        this.todos = [
            {name: 'Todo 1'},
            {name: 'Todo 2'}
        ];

        this.render(`
            <code (todos.length)="$el.innerText = JSON.stringify(#todos)"></code>
            <h1 (todos.length)></h1>
            <ul #todo-list 
                repeat="listItem in #todos" 
                (remove)="#model.remove($value.data)">
                
                <template>
                    
                    <div #edit-view 
                         (list-item.view)="
                            $value === 'edit' ? $el.style.display = 'block' : $el.style.display = 'none'">
                        <input type="checkbox" 
                               (list-item.is-checked)="$el.checked = !!$value" 
                               (change)="
                                    #listItem.toggleChecked(); 
                                    #$repeat.trigger('changed')">
                                    
                        <input (list-item.view)="$el.value = #listItem.name" (keyup)="#listItem.name = $el.value">
                        <button (click)="#listItem.view = 'display'">save</button>
                    </div>
                    <div #display-view
                         (list-item.view)="
                            $value === 'display' || !$value ? $el.style.display = 'block' : $el.style.display = 'none'
                         ">
                         <span (list-item.name)></span>
                        <button (click)="#listItem.view = 'edit'">edit</button> 
                        <button (click)="#$repeat.trigger('remove', #listItem)">Remove</button>
                    </div>
                
                
                </template>
            </ul>
            
            <input #input-name 
                   type="text">
            <button (click)="
                        #todos.push({name: #inputName.value});
                        #inputName.value = ''">
                Save <span (todos.length)></span>
            </button>
            <button (click)="#nonModel.name = 'Hej du!'">De va la smidigt detta då!</button>
            <button (click)="#todoList.repeat()">render</button>
        `);
    }
});
//
// class Todo extends Base{
//     createdCall(){
//
//         // we need the data before we render
//         this.data = new Model();
//         this.events = new Model();
//
//         this.render(`
//             <div>
//                 <div (#data.name)=".innerText = $value + 'dsd'"></div>
//                 <input #input type="checkbox" (#data.is-checked)="#input.checked = $value"/>
//                 <button #btn (click)="#trigger('checked', #data)">Check</button>
//             </div>
//         `);
//     }
//
//     /**
//      * This is to set the data from the outside
//      * @param value
//      */
//     setData(value){
//         Object.assign(this.data, value);
//     }
//
//     trigger(eventName){
//         this.dispatch(new Event(eventName));
//     }
// }
