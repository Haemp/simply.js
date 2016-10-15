
class Model{
    constructor(){
        this.observers = {};

        return new Proxy(this, {
            set: (target, property, value) => {
                target[property] = value;
                target.trigger(property, value);
                return true;
            }
        });
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
                listenerFunction(value);
            })
        }
    }

}

class Base extends HTMLElement{

    render(template){
        const events = [
            'click',
            'mouseover',
            'mousemove',
            'mouseout',
            'mousedown',
            'mouseup',
            'keypress',
            'keydown',
            'keyup',
            'change',
            'focus',
            'blur'
        ]
        this.innerHTML = template;
        this.querySelectorAll('*').forEach((element) => {

            // check if we have an attribute that is a watch
            Array.prototype.slice.apply(element.attributes).forEach((attr) => {
                const name = attr.name;
                const value = attr.value;

                // check if identifier
                if(name.match(/^#/)){
                    const cleanName = value;
                    this[cleanName] = element;
                    element.removeAttribute(name);
                    element.setAttribute('element-id', cleanName);
                    return;
                }

                // check if action
                if (name.match(/(^\(.+\))/)) {
                    const cleanAttr = name.replace(/[\(\)]/g, '');

                    /**
                     * <div #fisk (model.update)="#fisk.update()">
                     */
                    // check if there is a dot - that means we have to take
                    // the target into account
                    if (cleanAttr.includes('.')) {

                        const [target, property] = cleanAttr.split('.');

                        this[target].on(property, (propertyValue) => {
                            const cleanExec = value.replace(/#/g, 'this.');
                            new Function('$value', cleanExec).call(this, propertyValue);
                        });

                        const cleanExec = value.replace(/#/g, 'this.');
                        new Function('$value', cleanExec).call(this, this[target][property]);

                    }else{
                        if(events.includes(cleanAttr)){
                            element.addEventListener(cleanAttr, (event) => {
                                const cleanExec = value.replace(/#/g, 'this.');
                                new Function('$value', cleanExec).call(this, event);
                            })
                        }else{

                        }
                    }
                }
            });
        });
    }
}


class Test extends Base{
    createdCallback(){
        this.model =  new Model();
        this.model.state = 'FU';

        this.render(`
            <div #="div" (model.state)="#div.innerText = $value + $value"></div>
            <input #="input" type="text" (keyup)="#model.state = #input.value">
        `);

        this.model.state = 'FM';
        // how do we bind immediately
        // this.render(`
        //
        //     <ul #="list" (model.newTodo)="#list.items = #model.todos" render="todo in #list.items" >
        //         <li #="li" (todo.name)="#li.innerText = $value"></li>
        //     </ul>
        //
        //     <input #="input" type="text" >
        //     <button #="btn" (click)="#model.add({id: 1, text: #input.value})">Click</button>
        // `);
    }
}

class TodoModel extends Model{
    constructor(){
        this.todos = [];
    }

    add(todo){
        this.todos.push(Object.assign(new Model(), todo));
        this.trigger('newTodo', todo);
    }
}

document.registerElement('ah-test', Test);