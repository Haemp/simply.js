# simply.js
A javascript helper working from first principles

## Installation
```
npm install simplyjs --save
```

```html
<script src="path/to/simply.js"></script>
```

```

```

## Goals
- Optimized for congnitive load
- Fast development time
- Quick to learn and fun to master

```html
    <element name="sm-first-example" $show $repeat>
        <script>
            this.createdCallback = () => {
                this.title.innerText = 'Simply an example'; 
                this.list = [];
            };
        </script>
        <view>
            <h1 #title class="title"></h1>
            <div (list.length)="$repeat(this.list, 'listItem')" (list.length)="this.$show($value !== 0)">
                <template>
                    <h1 (list-item.name)></h1>
                    <span #greeting></span>
                    <input #input type="text" (change)="#greeting.innerText = #input.value"/>
                </template>
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

A way to add functions to elements through the compile? Is that needed?

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

```html
<div (list.length)="$el.$repeat($el, this.list, 'listItem')" $repeat>
    <template>
        <div (list-item.name)></div>
    </template>
</div>
```


### Show/Hide
```html
<div (list.length >= 0)="$el.$show($value)" $show>
</div>
```


### Adding custom components

## Gotchas
- Models have to be objects, 

## Todo
- [ ] Setup process
- [ ] Element registration
- [ ] Reapeat inner primitive
- [ ] Examples should show off as clear a principle as possible, then add syntactic sugar
- [ ] Should the data object carry it's own listeners? Or should we register them 
      in a global?
- [ ] Show/Hide
- [ ] Repeater
    - [ ] Updating a repeater
- [ ] Parent/Child element interaction
Could we do this inside the compiler - if any property of an object is listed as a cause
and that object does not have an on method we could simply switch the object with a proxy
`this.model = new Proxy(this.model, setters)`

- <element> is a way to automatically register an element

Since the compiler is not attached anymore - we should be able to do something very 
interesting with that. YOu don't really have to have a base element at all. 

1) include simplify.js
2) DOM loaded
3) Base.compile(body)

Could we dp


