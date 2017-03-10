document.registerElement('x-app', class extends Simply{

    createdCallback(){
        this.clicks = 0;
        this.render(`
            <div (click)="this.shoud()">asdadasd</div>
            <div>Number of clicks <span (compile)="$el.innerText = this.clicks"></span></div>
            <x-fudge (compile)="$el.fudge = this.clicks"></x-fudge>
        `)
    }

    shoud(){
        console.log(this.test);
        this.clicks++;
        this.update();
    }
});

document.registerElement('x-if', class extends Simply{

    createdCallback(){
        console.log('fudge created')

        this.render(`
            <div (compile)="$el.innerText = this._fudge"></div> 
        `);
    }

    render(htmlString){
        this.template = htmlString;


    }

    set fudge(value){
        this._fudge = value;
        this.update();
    }
});