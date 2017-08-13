import * as Simply from './../simply';

class Popup extends Simply.Component{

    static get template(){
        return `
           <div>
                <h2>This is the popup</h2>
                <slot name="content"></slot>
           </div>
        `;
    }

    connectedCallback(){
        this.render();
    }
}

Popup.compile();
customElements.define('s-popup', Popup);

class PopupContainer extends Simply.Component{

    static get template(){
        return `
           <div>
                <h1 >Popup container</h1>
                <s-popup>
                    <div slot="content">{{ this.test }}</div>
                </s-popup>
                <button (click)="this.onUpdate">Update</button>
           </div>
        `;
    }

    connectedCallback(){

        this.test = 'asdasd';
        this.render();
    }

    onUpdate(){
        console.log('Updating');
        this.test += '1';
        this.render()
    }
}

PopupContainer.compile();
customElements.define('s-popup-container', PopupContainer);
