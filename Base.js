
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

    static compileCauseEffect({node, element, attrName, attrValue}){
        let context = node;
        let expression = attrValue
        const cleanAttr = Base.snakeToCamel(attrName.replace(/[\(\)]/g, ''));

        if(!expression){
            expression = "$el.innerText = $value || ''";
        }

        // check if there is a dot - that means we have to take
        // the target into account
        // TODO check if the this[target] is a model or html element
        // HTML elements uses events and models uses propety assignments

        if (cleanAttr.includes('.')) {

            let [target, property] = cleanAttr.split('.');

            // if we're using $self we refer to the container
            // element root as the base for the property lookup.
            // this requires the context to be a Model
            // TODO Write try catch with better error

            if(context[target] instanceof HTMLElement){
                context[target].addEventListener(property, (event) => {
                    const cleanExec = expression.replace(/#/g, 'this.');
                    new Function(['$value', '$el'], cleanExec).call(context, event, element);
                })
            }else{

                if(!context[target]){
                    console.info('Auto Declaring model for: ', target, ' on ', context)
                    context[target] = Model.proxify({});
                }

                if(!context[target].$isProxy){
                    console.info('Auto Wrapping model for: ', target, ' on ', context)
                    context[target] = Model.proxify(context[target]);
                }

                context[target].on(property, (propertyValue) => {
                    Base.evaluate(expression, context, propertyValue, element);
                });

                Base.evaluate(expression, context, context[target][property], element);
            }


        }else{
            element.addEventListener(cleanAttr, (event) => {
                Base.evaluate(expression, context, event, element);
            })
        }

        element.removeAttribute(attrName);
        element.setAttribute('data-action', expression);
    }

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

    static compileRepeat({node, element, attrValue}){
        let expression = attrValue;

        element.trigger = (eventName, data) => {
            const event = new Event(eventName);
            event.data = data;
            element.dispatchEvent(event);
        }

        let refresh = () => {
            const tmpl = element.querySelector('template');
            const [arrayItemName, arrayRef] = expression.split(' in ');
            let array = Base.evaluate(arrayRef, node, null, element);
            let [model, prop] = arrayRef.replace('#', '').split('.');
            //let array = node[model][prop];

            // TODO: Perf improvement - can do this better

            // clean up DOM
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
                    wrapper.appendChild(instance)

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
        refresh()


        element.repeat = refresh;
        element.removeAttribute(name);
        element.setAttribute('data-repeat', expression);
    }

    static snakeToCamel(str){
        return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    }

    static compile(node){

        const refElements = [];
        const causeEffectElements = [];
        const repeatElements = [];

        Array.prototype.slice.apply(node.querySelectorAll('*')).concat(node).forEach((element) => {

            // check if we have an attribute that is a watch
            // TODO: Always apply id before cause effect
            Array.prototype.slice.apply(element.attributes).forEach((attr) => {
                const attrName = attr.name;
                const attrValue = attr.value;

                // check if identifier
                if(attrName.match(/^#/)){
                    refElements.push({element, attrName})
                    return;
                }

                // check if action
                if (attrName.match(/(^\(.+\))/)) {
                    causeEffectElements.push({element, attrName, attrValue});
                    return;
                }

                if(attrName.match(/^repeat/)){
                    repeatElements.push({element, attrName, attrValue})
                    return;
                }
            });
        });

        refElements.forEach(({element, attrName}) => {
            Base.compileRef({node, element, attrName})
        })

        repeatElements.forEach(({element, attrValue}) => {
            Base.compileRepeat({node, element, attrValue})
        })
        
        causeEffectElements.forEach(({element, attrName, attrValue}) => {
            Base.compileCauseEffect({node, element, attrName, attrValue});
        })

    }
    render(template){
        this.innerHTML = template;
        Base.compile(this);
    }
}

class Repeater extends HTMLTemplateElement{
    createdCallback(){

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
