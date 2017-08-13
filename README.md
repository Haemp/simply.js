# TODO
[ ] - add tests
[ ] - Write docs

# simply.js
There are two hard things in working with native javascript in a modern way.

1) Dependency management - Chrome 61 has native modules so this is being solved
2) Data <-> View management - Every framework out there has their own model of handling this.
And it is something you need to really work productively.

Simply.js aim is to remove the barriers to productivity while still staying as close to the
javascript standard as possible.

# Nesting
1) Shadow DOM is not visible for the iDOM
2) If a component modifies the DOM apart from through an iDOM template
   it will mess up the rendering. 

# Problems with attributes
- When iDOm initiates a new element it first adds the element to a fragment -completely naked
  of attributes. That means that you cannot rely on having all attributes ready in connectedCallback
- This also means that you do NOT have access to all the innerHTML before we are compiled complete

# Errors in Template javascript
- Sensible default - hiding vs warning. Hide by default and add an option to enable? 

## Installation
```
npm install simplyjs --save
```
```html
<script src="./node_modules/simply.js"></script>
```

## Examples

Simple view Example
```html
<html>
    <head>
        <script src="simply.min.js"></script>
    </head>
    <body>
        <div id="view"></div>
        <script >
            const app = document.querySelector('#view');
            app.strangerName = 'You';
            const render = Simply.compileTemplate('<div>Hello {{ this.strangerName }}</div>');
            render(app);
        </script>
    </body>
</html>
```

Simply Component example
```javascript
class SimplyComponent extends Simply.Component{

    static get template(){
        return 'hej';
    }

    connectedCallback(){

        // call this manually when the view needs to update
        this.render();
    }
}
customElements.define('s-simplycomponent', SimplyComponent);
SimplyComponent.compile();
```

Pure Web Components example
```javascript
class CustomElement extends HTMLElement{

    static get template(){
        return `
            <div>
                <ul>
                    <li (click)="this.select(item)" id="{item.id}" each="item in this.items">
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
        CustomElement.render(this, this.shadow)
    }
}
CustomElement.render = Simply.compileTemplate(CustomElement.template);
```
