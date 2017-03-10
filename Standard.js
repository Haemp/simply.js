/**
 * Ideal model for developer UX
 */
class Component extends SimplyComp{

    createdCallback(){

        // this is based on a FIRST run through
        // where ALL the elements are appended to the DOM
        // and then compiled for a first time.

        // second time we compile we compare the rules
        // against the current state of the DOM Object

        // Adding and Deleting DOM

        // iterate over the current registered rules
        // evaluate them in the scope
        // but also compare

        // ()="" bindings do not ever update - either they are removed or added


        this.render(`
            <div> 
                <button (click)="this.clicked()">Fooooo</button> <!-- check that the button has a click listener to the correct funciton -->
                <h1 (compile)="$el.innerHTML = this.title"></h1> <!-- Check if newTitle != oldTitle -->
                 
                <if (compile)="title == 'buck'"> <!-- check that the expression is the same as before -->
                    <div (compile)="this.title"></div>
                </if>
                
                <repeat (compile)="$el.render()" for="item in items">
                    <if if="item.foo == 'bar'">Do that</if>
                </repeat>
                
                <new-thing-adder sid="adder" (new)="this.addNewThing()"></new-thing-adder>
            </div>
        `);
    }

    addNewThing(){
        this.items.push('New thing');

        this.update();
    }

    clicked(){
        this.title = 'clicked title';
        this.render();
    }
}

class IfComp extends HTMLElement{

    createdCallback(){

    }

    set if(value){
        if(value === true){
            this.render()
        }else{
            this.unRender();
        }
    }
}

class SimplyComp extends HTMLElement{
    render(templateString){

        // property assignments
        this.oldTemplate = parseTemplate(templateString);




    }

    compile(data, string){
        // what if we just compile the rules into the actuall css and then
        // reevaluate them against the current DOM node


    }
}
