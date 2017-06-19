class WebComponent extends HTMLElement{

    static get template(){
        return `
            <div>
                <ul>
                    <li (click)="this.select(item)" each="item in this.items">
                        {{ item.name }}
                    </li>
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