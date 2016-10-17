# simply.js
A javascript helper working from first principles

## Goals
- Optimized for congnitive load
- Fast development time
- Quick to learn and fun to master

```html
    <element name="sm-first-example">
        <script>
            this.createdCallback = () => {
                this.title.innerText = 'Simply an example';
                
                this.list = [];
            };
        </script>
        <view>
            <h1 #title class="title"></h1>
            <div>
                <span #greeting></span>
                <input #input type="text" (change)="#greeting.innerText = #input.value"/>
            </div>
            <sm-nested #nested-element></sm-nested>
        </view>
        <style>
            .title{
                color: red;
            }
        </style>
    </element>
    
    <element name="sm-nested">
        <script>
            
        </script>
        <view>
            <h2>Nested </h2>
        </view>
    </element>
    
    <addon>
        <script>
            
        </script>
    </addon>
```

## Cause and Effect
(cause)="effect"
(click)="alert('hi')"

How do I trigger cause?
- On an HTML element simply use the event dispatcher
- Models are objects with built in event management
- You can create objects with this ability by implementing the `on()` method
```javascript
{
    data: 4,
    on(){
        
    }
}
```
## Identity

## Model
A model is an object whos properties can be listened to. A change in a property
of a model will cause an event

## Components

### Model
- Must be assinged before the compilation or?
### Repeater
### Show/Hide
### Adding custom components

## Gotchas
- Models have to be objects, 

## Todo
- [ ] Should the data object carry it's own listeners? Or should we register them 
      in a global?
      
Could we do this inside the compiler - if any property of an object is listed as a cause
and that object does not have an on method we could simply switch the object with a proxy
`this.model = new Proxy(this.model, setters)`