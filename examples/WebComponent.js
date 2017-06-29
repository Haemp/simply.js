class WebComponent extends HTMLElement{

    static get template(){
        return `
            <div>
                <ul if="this.timesRendered === 3">
                    <s-simplycomponent (click)="this.select(item)" id="{item.name}" each="item in this.items"></s-simplycomponent>
                </ul>
                <s-anothercomponent></s-anothercomponent>
                <s-anothersimplycomponent></s-anothersimplycomponent>
                <div if="this.selectedItem">
                    {{ this.selectedItem.name }} is my favorite
                </div>
                <button (click)="this.render()">Render {{ this.timesRendered }}</button>
            </div>
        `;
    }

    constructor(){
        super();

        this.timesRendered = 0;
        this.shadow = this.attachShadow({mode: 'open'});
        this.items = [
            {name: 'Jessica'},
            {name: 'Carla'},
            {name: 'Christy'}
        ];
    }

    select(item){
        this.selectedItem = item;
        this.render();
    }

    connectedCallback(){
        this.render();
    }

    render(){
        this.timesRendered++;
        console.log('Re-rendering');
        WebComponent.render(this, this.shadow)
    }
}
WebComponent.render = Simply.compileTemplate(WebComponent.template);
customElements.define('s-webcomponent', WebComponent);

console.log(Simply.Component);

class SimplyComponent extends Simply.Component{

    static get template(){
        return 'hej';
    }

    connectedCallback(){
        console.log('Here we don\'t have any incremental-dom attributes yet', this.attributes.length);
    }

    compiledCallback(){
        console.log('Here they are', this.attributes.length);
        this.render();
    }
}
customElements.define('s-simplycomponent', SimplyComponent);
SimplyComponent.compile();

/**
 * This is an example of a component that limits the incremental dom
 * from rendering its children. This is necessary to solve the problem
 * of HTML added via innerHTML. That is HTML NOT represented in the template
 *
 * We tell the iDOM that we do not want our children compiled by adding
 * the .$shadyDom property
 */
class AnotherComponent extends HTMLElement{

    constructor(){
        super();
        this.$shadyDom = true;
    }

    compiledCallback(){
        this.innerHTML = `
            <div>
                this is a bigger view, that shouldnt be compiled
                <input type="text">
            </div>
        `;
    }
}
customElements.define('s-anothercomponent', AnotherComponent);

class AnotherSimplyComponent extends Simply.Component{

    static get shadyDom(){
        return true;
    }

    static get template(){
        return `
            <div>
                Another Simply component {{ this.taliho }}
                <input type="text" (keydown)="this.onChange($event)">
            </div>
        `;
    }

    connectedCallback(){
        this.render();
    }

    onChange(evt){
        this.taliho = evt.target.value;
        this.render();
    }
}
AnotherSimplyComponent.compile();
customElements.define('s-anothersimplycomponent', AnotherSimplyComponent);