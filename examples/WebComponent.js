class WebComponent extends HTMLElement{

    static get template(){
        return `
            <div>
                <ul>
                    <s-simplycomponent (click)="this.select(item)" id="{item.name}" each="item in this.items"></s-simplycomponent>
                </ul>
                <div if="this.selectedItem">
                    {{ this.selectedItem.name }} is my favorite
                </div>
            </div>
        `;
    }

    constructor(){
        super();
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